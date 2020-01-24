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
const { timeout, TimeoutError } = require("promise-timeout");

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

    // Shutdown all booted simulators (as they might interfeer by loading and executing the Metro bundle)
    xcode.simctl.shutdown('all');

    // Determine if the device exists and has the correct deviceTypeId and latest runtime
    const { devices: devicesByType } = xcode.simctl.list('devices', 'available');
    const availableDevices = [].concat(...Object.keys(devicesByType).map(type => devicesByType[type]));
    // Filter devices, so we're only focussing on devices of the expected name
    const devices = availableDevices.filter(({ name }) => name === deviceName);

    // Delete any existing devices with the expected name
    for (const device of devices) {
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
    console.log('Booting simulator');
    xcode.simctl.boot(deviceId);
    console.log('Simulator is booting');
    xcode.simctl.bootstatus(deviceId);
    console.log('Simulator is booted');
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
        const deviceName = "realm-js-integration-tests";
        ensureSimulator(deviceName, 'com.apple.CoreSimulator.SimDeviceType.iPhone-11');
        console.log("Simulator is ready 🚀");
        // Open the bundle URL (ensures that the simulator can connect to the Metro server, when the app loads)
        xcode.simctl.openUrl(deviceName, 'http://localhost:8081');
        // Ask React Native to run the ios app
        rn.sync("run-ios", "--no-packager", "--simulator", deviceName);
    } else {
        throw new Error(`Unexpected platform: '${platform}'`);
    }

    // Run tests with a 5 minute timeout
    return timeout(new Promise((resolve) => {
        console.log("Running tests 🏃‍♂️");
        server.run(resolve);
    }), 60000 * 5);
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
    console.log(`Completed running (${failures} failures)`);
    // Exit with a non-zero code if we had failures
    process.exit(failures > 0 ? 1 : 0);
}, err => {
    if (err instanceof TimeoutError) {
        console.error("Timed out running tests");
    } else {
        console.error(err.stack);
    }
    process.exit(2);
});
