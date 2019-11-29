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

const { MochaRemoteServer } = require("mocha-remote-server");

const rn = require("./react-native-cli");
const android = require("./android-cli");
const xcode = require("./xcode-cli");

/**
 * Ensure the simulator is created and booted
 */
function ensureSimulator(deviceName, deviceTypeId) {
    const version = xcode.xcrun("--version").stdout.trim();
    console.log(`Using ${version}`);

    // Determine if the system supports the device type id
    const { devicetypes } = xcode.simctl.list('devicetypes');
    const deviceType = devicetypes.find(({ identifier }) => identifier === deviceTypeId);
    if (!deviceType) {
        throw new Error(`System doesn't have the "${deviceTypeId}" device type`);
    }

    // Determine if the device exists and has the correct deviceTypeId and latest runtime
    const { devices: devicesByType } = xcode.simctl.list('devices', 'available');
    const availableDevices = [].concat(...Object.keys(devicesByType).map(type => devicesByType[type]));
    // Filter devices, so we're only focussing on devices of the expected name
    const devices = availableDevices.filter(({ name }) => name === deviceName);

    // Delete any existing devices with the expected name
    for (const device of devices) {
        if (device.state !== "Shutdown") {
            console.log(`Shutting down simulator (id = ${device.udid})`);
            xcode.simctl.shutdown(device.udid);
        }
        console.log(`Deleting simulator (id = ${device.udid})`);
        xcode.simctl.delete(device.udid);
    }

    const { runtimes } = xcode.simctl.list('runtimes', 'ios');
    const [ runtime ] = runtimes.filter(runtime => runtime.isAvailable);
    if (!runtime) {
        throw new Error("No available iOS runtimes");
    }
    // Create the device
    const { stdout } = xcode.simctl.create(deviceName, deviceTypeId, runtime.identifier);
    const deviceId = stdout.trim();
    console.log(`Created simulator device (id = ${deviceId})`);
    // Boot up the device
    console.log(`Booting simulator`);
    xcode.simctl.boot(deviceId);
    console.log(`Waiting for simulator`);
    // Wait for "com.apple.springboard" launching, to ensure device is ready ...
    xcode.simctl.launch(deviceName, "com.apple.springboard");
    return deviceId;
}

async function runApp(platform, junitFilePath) {
    const mochaConfig = {};

    // Check if an argument for junit path was requested
    if (junitFilePath) {
        mochaConfig.reporter = "mocha-junit-reporter";
        mochaConfig.reporterOptions = {
            mochaFile: junitFilePath,
        };
    }

    const server = new MochaRemoteServer(mochaConfig, {
        // Accept connections only from the expected platform, to prevent cross-talk when both emulators are open
        id: platform,
    });
    await server.start();

    // Spawn a react-native metro server
    const metro = rn.async("start",  /*"--verbose", "--reset-cache"*/);
    // Kill metro when the process is killed
    process.on("exit", (code) => {
        metro.kill("SIGHUP");
    });
    // Close the runner if metro closes unexpectedly
    metro.on("close", (code) => {
        if (code !== 0) {
            console.error(`Metro server unexpectedly closed (code = ${code})`);
            process.exit(code);
        }
    });

    if (platform === "android") {
        const devices = android.adb.devices();
        const activeDevices = devices.filter(({ state }) => state === "device");
        if (activeDevices.length === 0) {
            throw new Error("Missing an active device: Attach a device via USB or start an emulator");
        } else {
            // Ensure the device can access the mocha remote server
            android.adb.reverseServerPort(MochaRemoteServer.DEFAULT_CONFIG.port);
        }
        // Ask React Native to run the android app
        rn.sync("run-android", "--no-packager");
    } else if (platform === "ios") {
        const deviceName = 'realm-js-integration-tests';
        ensureSimulator(deviceName, 'com.apple.CoreSimulator.SimDeviceType.iPhone-11');
        console.log("Simulator is ready 🚀");
        // Ask React Native to run the ios app
        rn.sync("run-ios", "--no-packager", `--simulator`, deviceName);
    } else {
        throw new Error(`Unexpected platform: '${platform}'`);
    }

    // Wait until the tests ends
    return new Promise((resolve) => {
        server.run((failures) => {
            resolve(failures);
        });
    });
}

async function run() {
    const platform = process.argv[2];
    if (!platform) {
        throw new Error("Expected a platform runtime argument");
    }
    const junitFilePath = process.argv[3];
    // Run the application
    return runApp(platform, junitFilePath);
}

run().then(failures => {
    // Exit with a non-zero code if we had failures
    process.exit(failures > 0 ? 1 : 0);
}, err => {
    console.error(err.stack);
    process.exit(2);
});
