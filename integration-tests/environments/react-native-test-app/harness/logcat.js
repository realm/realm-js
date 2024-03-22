////////////////////////////////////////////////////////////////////////////
//
// Copyright 2021 Realm Inc.
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

const android = require("./android-cli");

function getProcessId(packageName) {
  try {
    return android.adb.shellPidOf(packageName);
  } catch (err) {
    if (err instanceof Error && err.message.includes("no devices/emulators found")) {
      console.error("The emulator disappeared - exiting the runner!");
      process.exit(1);
    }
    // We'll consider the pid unavailable on any failure
    return undefined;
  }
}

async function start(packageName, skipInitialPid = false) {
  let logCatProcess = null;
  let currentPid = skipInitialPid ? getProcessId(packageName) : undefined;
  console.log(`Waiting for a ${packageName} to start`);
  for (;;) {
    const pid = getProcessId(packageName);
    if (pid && !currentPid) {
      console.log(`The ${packageName} process booted (pid = ${pid})`);
    } else if (pid && currentPid && pid !== currentPid) {
      console.log(`A new ${packageName} process booted (pid = ${pid})`);
    } else if (!pid && currentPid) {
      console.log(`The ${packageName} process disappeared (pid = ${currentPid})`);
    }
    // React to the change of pid
    if (pid !== currentPid) {
      currentPid = pid;
      if (logCatProcess) {
        // Kill any old process
        console.log(`Killing old logcat process (pid = ${logCatProcess.pid})`);
        logCatProcess.kill();
      }
      // (re)start the logcat process
      if (pid) {
        logCatProcess = android.adb.logcat("--pid", pid, "-v", "color");
        console.log(`Spawned a new logcat process (pid = ${logCatProcess.pid})`);
      }
    }
    // Wait a sec ...
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

if (module.parent === null) {
  start("com.realmreactnativetests").catch(console.error);
}

module.exports = { start };
