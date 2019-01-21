////////////////////////////////////////////////////////////////////////////
//
// Copyright 2016 Realm Inc.
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

const cp = require("child_process");

function getAdbPath() {
    return process.env.ANDROID_HOME
        ? process.env.ANDROID_HOME + "/platform-tools/adb"
        : "adb";
}

function getEmulatorPath() {
    return process.env.ANDROID_HOME
        ? process.env.ANDROID_HOME + "/tools/emulator"
        : "emulator";
}

function execSync(path, args, returnStdOut) {
    if (returnStdOut) {
        return cp.execFileSync(path, args, {
            encoding: "utf8"
        });
    } else {
        cp.execFileSync(path, args, {
            stdio: ["inherit", "inherit", "inherit"]
        });
    }
}

const adb = {
    exec(args, returnStdOut = true) {
        const path = getAdbPath();
        console.log(`Running ${path} ${args.join(" ")}`);
        return execSync(path, args, returnStdOut);
    },
    reverseServerPort(port) {
        adb.exec(["reverse", `tcp:${port}`, `tcp:${port}`], false);
    },
    devices() {
        const output = adb.exec(["devices"]).trim().split("\n");
        // Remove the "List of devices attached"
        const [ intro, ...devices ] = output;
        if (intro !== "List of devices attached") {
            throw new Error("Unexpected output from ADB");
        }
        // Return the list of devices
        return devices;
    },
};

const emulator = {
    exec(args, returnStdOut = true) {
        const path = getEmulatorPath();
        console.log(`Running ${path} ${args.join(" ")}`);
        return execSync(path, args, returnStdOut);
    },
    devices() {
        return emulator.exec(["-list-avds"]).trim().split("\n");
    },
    start(avd) {
        const path = getEmulatorPath();
        return cp.spawn(path, [ "-avd", avd, "-verbose" ]);
    }
};

module.exports = { adb, emulator };
