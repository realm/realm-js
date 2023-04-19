////////////////////////////////////////////////////////////////////////////
//
// Copyright 2019 Realm Inc.
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

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import module from "node:module"
import { rollup } from "rollup";

const require = module.createRequire(import.meta.url);

// Adjust this as the expected execution time increases
const TIMEOUT_MS = 1000 * 30; // 30 seconds

type ProcessType = "main" | "renderer";

const appPaths: Partial<Record<NodeJS.Platform, string>> = {
  darwin: "dist/mac/realm-electron-tests.app/Contents/MacOS/realm-electron-tests",
  linux: "dist/linux-unpacked/realm-electron-tests",
  win32: "dist/win-unpacked/realm-electron-tests.exe",
};

function determineSpawnParameters(processType: ProcessType) {
  const platform = process.platform;
  const relativeAppPath = appPaths[platform];
  if (!relativeAppPath) {
    throw new Error(`Unsupported platform: ${platform}`);
  }
  const appPath = path.resolve(relativeAppPath);
  if (fs.existsSync(appPath)) {
    if (platform === "darwin") {
      return {
        command: appPath,
        args: ["--", processType],
      };
    } else {
      throw new Error(`Running tests on ${platform} is not supported yet`);
    }
  } else {
    console.warn("🚧 Running an unpackaged version of the app 🚧");
    return {
      command: require("electron"),
      args: [".", processType, "--enable-logging"],
    };
  }
}

function runElectron(processType: ProcessType) {
  const { command, args } = determineSpawnParameters(processType);
  // Spawn the Electron app
  const env = Object.create(process.env);
  env.ELECTRON_DISABLE_SANDBOX = 1;
  const appProcess = spawn(command, args, { stdio: "inherit", env });
  // If the runner closes, we should kill the Electron app
  process.on("exit", () => {
    appProcess.kill("SIGHUP");
  });
  return appProcess;
}

async function run() {
  const processType = process.argv[2];
  if (processType !== "main" && processType !== "renderer") {
    throw Error("You need to call this with a runtime argument specifying the process type");
  }

  // Spawn the electron process
  const appProcess = runElectron(processType);
  console.log(`Started the Electron app (pid = ${appProcess.pid})`);
}

function timeout(ms: number) {
  return new Promise((_, reject) => {
    setTimeout(() => {
      const err = new Error(`Timed out after ${ms}ms`);
      reject(err);
    }, ms);
  });
}

Promise.race([run(), timeout(TIMEOUT_MS)]).catch((error) => {
  console.error("Test harness failure:", error);
  process.exit(1);
});
