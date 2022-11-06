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

import * as path from "node:path";
import * as cp from "node:child_process";
import * as fs from "node:fs";
import { createServer, Server } from "http";

const __dirname = new URL(".", import.meta.url).pathname;

const DEFAULT_APP_PATH = path.resolve(__dirname, "app");
const APP_JS_PATH = path.resolve(__dirname, "App.js");
const PORT = 3000;
const TIMEOUT = 5 * 60 * 1000; // 5 min should be pleanty of time

const appName = "InstallTestApp";

function exec(command: string, args: string[], options: cp.SpawnOptions = {}) {
  const result = cp.spawnSync(command, args, { stdio: "inherit", ...options });
  if (result.status !== 0) {
    process.exit(result.status);
  }
}

function getEnv(newArchitecture: boolean): Record<string, string> {
  const env = { ...process.env };
  if (newArchitecture) {
    // Needed by iOS when running "pod install"
    env.RCT_NEW_ARCH_ENABLED = "1";
    // Needed by Android when running Gradle
    env.ORG_GRADLE_PROJECT_newArchEnabled = "true";
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

yargs(hideBin(process.argv))
  .option("app-path", { type: "string", default: DEFAULT_APP_PATH })
  .option("new-architecture", { type: "boolean", default: false })
  .command(
    "init",
    "Initialize the app template",
    (args) =>
      args
        .option("realm-version", { type: "string", default: "latest" })
        .option("react-native-version", { type: "string", default: "latest" })
        .option("force", { description: "Delete any existing app directory", type: "boolean", default: false })
        .option("skip-ios", { description: "Skip the iOS specific steps", type: "boolean", default: false }),
    (argv) => {
      const {
        "app-path": appPath,
        "realm-version": realmVersion,
        "react-native-version": reactNativeVersion,
        "new-architecture": newArchitecture,
        "skip-ios": skipIOS,
        force,
      } = argv;

      const env = getEnv(newArchitecture);

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
      exec("npm", ["install", `realm@${realmVersion}`], { cwd: appPath });

      if (!skipIOS) {
        console.log(`Installing gem bundle (needed to pod-install for iOS)`);
        exec("bundle", ["install"], { cwd: appPath });

        console.log(`Installing CocoaPods`);
        exec("pod", ["install"], { cwd: path.resolve(appPath, "ios"), env });
      }

      console.log("Overwriting App.js");
      const appJsDest = path.resolve(appPath, "App.js");
      fs.copyFileSync(APP_JS_PATH, appJsDest);
    },
  )
  .command(
    "test",
    "Start the test application",
    (args) => args.option("platform", { type: "string", choices: ["android", "ios"], demandOption: true }),
    async (argv) => {
      const { "app-path": appPath, "new-architecture": newArchitecture, platform } = argv;

      if (!fs.existsSync(appPath)) {
        throw new Error(`Expected a React Native app at '${appPath}'`);
      }

      const env = getEnv(newArchitecture);

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
          exec("npx", ["react-native", "run-android", "--no-packager"], { cwd: appPath, env });
          // Expose the port we're listening on
          console.log(`Exposing port ${PORT}`);
          exec("adb", ["reverse", `tcp:${PORT}`, `tcp:${PORT}`]);
        } else if (platform === "ios") {
          // TODO: Start building using ccache
          exec("npx", ["react-native", "run-ios", "--no-packager"], { cwd: appPath, env });
        }

        // Start the countdown
        const timeout = new Promise((_, reject) => {
          const timer = setTimeout(() => {
            const err = new Error("It took too long for the app to send the message");
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
        const expectedMessage = "Persons are Alice, Bob, Charlie";
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
  .parse();
