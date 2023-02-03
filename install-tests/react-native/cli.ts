////////////////////////////////////////////////////////////////////////////
//
// Copyright 2022 Realm Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
////////////////////////////////////////////////////////////////////////////

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import * as semver from "semver";

import * as path from "node:path";
import * as cp from "node:child_process";
import * as fs from "node:fs";
import { createServer, Server } from "node:http";

const __dirname = new URL(".", import.meta.url).pathname;

const DEFAULT_APP_PATH = path.resolve(__dirname, "app");
const PATCHES_PATH = path.resolve(__dirname, "patches");
const APP_JS_PATH = path.resolve(PATCHES_PATH, "App.js");
const CCACHE_PODFILE_PATCH_PATH = path.resolve(PATCHES_PATH, "ccache-Podfile.patch");
const JSC_PODFILE_PATCH_PATH = path.resolve(PATCHES_PATH, "jsc-Podfile.patch");
const JSC_BUILD_GRADLE_PATCH_PATH = path.resolve(PATCHES_PATH, "jsc-build.gradle.patch");
const PORT = 3000;
const TIMEOUT = 5 * 60 * 1000; // 5 min should be plenty of time from app has launched until message gets received

const appName = "InstallTestApp";

function exec(command: string, args: string[], options: cp.SpawnOptions = {}) {
  const { status } = cp.spawnSync(command, args, { stdio: "inherit", ...options });
  if (status !== 0) {
    process.exitCode = status;
    throw new Error(`Failed running '${command} ${args.join(" ")}' (code = ${status})`);
  }
}

type EnvOptions = { newArchitecture?: boolean; engine?: string };

function getEnv({ newArchitecture, engine }: EnvOptions = {}) {
  const env: Record<string, string> = {
    ...process.env,
    // Add ccache specific configuration
    CCACHE_SLOPPINESS:
      "clang_index_store,file_stat_matches,include_file_ctime,include_file_mtime,ivfsoverlay,pch_defines,modules,system_headers,time_macros",
    CCACHE_FILECLONE: "true",
    CCACHE_DEPEND: "true",
    CCACHE_INODECACHE: "true",
  };
  if (newArchitecture) {
    // Needed by iOS when running "pod install"
    env.RCT_NEW_ARCH_ENABLED = "1";
  }
  if (engine) {
    // From 0.71.0, controlling on the engine is possible on iOS through an environment variable
    env.USE_HERMES = engine === "hermes" ? "1" : "0";
  }
  return env;
}

async function waitForMessage(server: Server) {
  return new Promise((resolve, reject) => {
    server.on("request", (req, res) => {
      console.log("Client connected");
      req.on("data", (data) => {
        const message = data.toString("utf-8");
        res.statusCode = 200;
        res.end();
        req.destroy();
        resolve(message);
      });
    });
    server.once("error", reject);
  });
}

function applyPatch(patchPath: string, targetPath: string) {
  if (fs.existsSync(targetPath)) {
    exec("patch", [targetPath, patchPath]);
  } else {
    console.log(`Skipping patch, since ${targetPath} doesn't exist on the filesystem`);
  }
}

function readPackageJson(packagePath: string) {
  return JSON.parse(fs.readFileSync(path.resolve(packagePath, "package.json"), "utf8"));
}

yargs(hideBin(process.argv))
  .strict()
  .demandCommand()
  .option("app-path", { type: "string", default: DEFAULT_APP_PATH })
  .command(
    "init",
    "Initialize the app template",
    (args) =>
      args
        .option("new-architecture", { type: "boolean", default: false })
        .option("realm-version", { type: "string", default: "latest" })
        .option("react-native-version", { type: "string", default: "latest" })
        .option("engine", { type: "string", choices: ["hermes", "jsc"], default: "hermes" })
        .option("force", { description: "Delete any existing app directory", type: "boolean", default: false })
        .option("skip-bundle-install", {
          description: "Skip the iOS specific 'bundle install'",
          type: "boolean",
          default: false,
        })
        .option("skip-pod-install", {
          description: "Skip the iOS specific 'pod install'",
          type: "boolean",
          default: false,
        }),
    (argv) => {
      const {
        "app-path": appPath,
        "realm-version": realmVersion,
        "react-native-version": reactNativeVersion,
        "new-architecture": newArchitecture,
        "skip-bundle-install": skipBundleInstall,
        "skip-pod-install": skipPodInstall,
        engine,
        force,
      } = argv;

      const env = getEnv({ newArchitecture, engine });

      console.log(`Initializing react-native@${reactNativeVersion} template into '${appPath}'`);
      console.log("New achitecture is", newArchitecture ? "enabled" : "disabled");

      if (fs.existsSync(appPath) && force) {
        console.log("Deleting existing app directory! (because --force)");
        fs.rmSync(appPath, { recursive: true });
      }

      exec("npx", [
        "--yes",
        "react-native",
        "init",
        "--npm",
        "--skip-install", // We'll do this in a different step
        appName,
        "--version",
        reactNativeVersion,
        "--directory",
        appPath,
      ]);

      console.log(`Adding realm@${realmVersion} to the app (and installing dependencies)`);
      // We're using force to succeed on peer dependency issues
      exec("npm", ["install", `realm@${realmVersion}`, "--force"], { cwd: appPath });

      const podfilePath = path.resolve(appPath, "ios", "Podfile");
      console.log(`Patching podfile to use ccache (${podfilePath})`);
      applyPatch(CCACHE_PODFILE_PATCH_PATH, podfilePath);

      const { version: resolvedReactNativeVersion } = readPackageJson(
        path.resolve(appPath, "node_modules/react-native"),
      );

      // TODO: Delete this once 0.71.0 or above is latest
      if (semver.satisfies(resolvedReactNativeVersion, "<0.71.0")) {
        if (engine === "jsc") {
          console.log(`Patching Podfile to use JSC (${podfilePath})`);
          applyPatch(JSC_PODFILE_PATCH_PATH, podfilePath);

          const appGradleBuildPath = path.resolve(appPath, "android", "app", "build.gradle");
          console.log(`Patching app/build.gradle to use JSC (${appGradleBuildPath})`);
          applyPatch(JSC_BUILD_GRADLE_PATCH_PATH, appGradleBuildPath);
        }
      } else {
        console.log("Skipping patch of Podfile to use JSC, relying on USE_HERMES env variable instead");
      }

      // Store Gradle properties for RN >=0.71.0
      const localPropertiesPath = path.resolve(appPath, "android/gradle.properties");
      const localProperties = {
        newArchEnabled: newArchitecture,
        hermesEnabled: engine === "hermes",
      };
      const localPropertiesContent =
        "\n# Install test overwrites below\n\n" +
        Object.entries(localProperties)
          .map(([k, v]) => `${k}=${v}`)
          .join("\n");

      console.log(`Appending gradle properties to ${localPropertiesPath}`);
      fs.appendFileSync(localPropertiesPath, localPropertiesContent);

      if (!skipBundleInstall) {
        console.log(`Installing gem bundle (needed to pod-install for iOS)`);
        exec("bundle", ["install"], { cwd: appPath });
      }

      if (!skipPodInstall) {
        console.log(`Installing CocoaPods`);
        // Use --no-repo-update to avoid updating the repo if the install fails
        exec("bundle", ["exec", "pod", "install", "--no-repo-update"], { cwd: path.resolve(appPath, "ios"), env });
      }

      console.log("Overwriting App.js");
      const appJsDest = path.resolve(appPath, "App.js");
      fs.copyFileSync(APP_JS_PATH, appJsDest);
    },
  )
  .command(
    "test",
    "Start the test application",
    (args) =>
      args
        .option("platform", { type: "string", choices: ["android", "ios"], demandOption: true })
        .option("release", { description: "Build the app in 'release' mode", type: "boolean", default: false }),
    async (argv) => {
      const { "app-path": appPath, platform, release } = argv;

      if (!fs.existsSync(appPath)) {
        throw new Error(`Expected a React Native app at '${appPath}'`);
      }

      const env = getEnv();

      function prematureExitCallback(code: number) {
        console.log(`Metro bundler exited unexpectedly (code = ${code})`);
        process.exit(code || 1);
      }

      const metro = cp.spawn("npx", ["react-native", "start"], { cwd: appPath, stdio: "inherit" });
      metro.addListener("exit", prematureExitCallback);

      const server = createServer().listen(PORT);

      try {
        console.log("Started listening for a message from the app");

        // Don't await the message before the app has started
        const message = waitForMessage(server);

        // Start the app
        if (platform === "android") {
          // Using --active-arch-only to speed things up 🙏
          exec(
            "npx",
            [
              "react-native",
              "run-android",
              "--no-packager",
              "--active-arch-only",
              ...(release ? ["--variant", "release"] : []),
            ],
            { cwd: appPath, env },
          );
          // Expose the port we're listening on
          console.log(`Exposing port ${PORT}`);
          exec("adb", ["reverse", `tcp:${PORT}`, `tcp:${PORT}`]);
        } else if (platform === "ios") {
          // TODO: Start building using ccache
          exec(
            "npx",
            ["react-native", "run-ios", "--no-packager", ...(release ? ["--configuration", "Release"] : [])],
            {
              cwd: appPath,
              env,
            },
          );
        }

        // Start the countdown
        const timeout = new Promise((_, reject) => {
          const timer = setTimeout(() => {
            const sec = Math.floor(TIMEOUT / 1000);
            const err = new Error(`It took too long (> ${sec}s) for the app to send the message`);
            reject(err);
          }, TIMEOUT);
          // Makes sure this doesn't hang the process on successful exit
          server.on("connection", () => {
            clearTimeout(timer);
          });
        });

        // Await the response from the server or a timeout
        const actualMessage = await Promise.race([message, timeout]);
        console.log(`App sent "${actualMessage}"!`);
        const expectedMessage = "Persons are Alice, Bob, Charlie!";
        if (actualMessage === expectedMessage) {
          console.log("... which was expected ✅");
        } else {
          return new Error(`Expected '${expectedMessage}', got '${actualMessage}'`);
        }
      } finally {
        // Kill metro, in silence
        metro.removeListener("exit", prematureExitCallback);
        metro.kill();
        // Stop listening for the app
        server.close();
      }
    },
  )
  .help()
  .parse();
