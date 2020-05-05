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
const Yargs = require("yargs");
const path = require("path");

// The peer deps are required as dependencies for Android to include RealmJS in the APK.
require("../../peer-deps-as-deps");

const rn = require("./react-native-cli");
const android = require("./android-cli");
const xcode = require("./xcode-cli");

const IOS_DEVICE_NAME = "realm-js-integration-tests";
const IOS_DEVICE_TYPE_ID = "com.apple.CoreSimulator.SimDeviceType.iPhone-11";

/**
 * Ensure a simulator is created and booted
 */
function ensureSimulator(platform, deleteExisting = false) {
    if (platform === "android") {
        const devices = android.adb.devices();
        const activeDevices = devices.filter(({ state }) => state === "device");
        if (activeDevices.length === 0) {
            throw new Error(
                "Missing an active device: Attach a device via USB or start an emulator",
            );
        } else {
            // Ensure the device can access the mocha remote server
            android.adb.reverseServerPort(
                MochaRemoteServer.DEFAULT_CONFIG.port,
            );
        }
    } else if (platform === "ios") {
        const version = xcode.xcrun("--version").stdout.trim();
        console.log(`Using ${version}`);

        // Determine if the system supports the device type id
        const { devicetypes } = xcode.simctl.list("devicetypes");
        const deviceType = devicetypes.find(
            ({ identifier }) => identifier === IOS_DEVICE_TYPE_ID,
        );
        if (!deviceType) {
            throw new Error(
                `System doesn't have the "${IOS_DEVICE_TYPE_ID}" device type`,
            );
        }

        // Shutdown all booted simulators (as they might interfeer by loading and executing the Metro bundle)
        xcode.simctl.shutdown("all");

        // Determine if the device exists and has the correct IOS_DEVICE_TYPE_ID and latest runtime
        const { devices: devicesByType } = xcode.simctl.list(
            "devices",
            "available",
        );
        const availableDevices = [].concat(
            ...Object.keys(devicesByType).map((type) => devicesByType[type]),
        );
        // Filter devices, so we're only focussing on devices of the expected name
        const devices = availableDevices.filter(
            ({ name }) => name === IOS_DEVICE_NAME,
        );

        if (deleteExisting) {
            // Delete any existing devices with the expected name
            for (const device of devices) {
                console.log(`Deleting simulator (id = ${device.udid})`);
                xcode.simctl.delete(device.udid);
            }
        } else if (devices.length > 0) {
            // Use the first device with the expected name
            return devices[0].udid;
        }

        const { runtimes } = xcode.simctl.list("runtimes", "ios");
        const [runtime] = runtimes.filter((r) => r.isAvailable);
        if (!runtime) {
            throw new Error("No available iOS runtimes");
        }
        // Create the device
        const { stdout } = xcode.simctl.create(
            IOS_DEVICE_NAME,
            IOS_DEVICE_TYPE_ID,
            runtime.identifier,
        );
        const deviceId = stdout.trim();
        console.log(`Created simulator device (id = ${deviceId})`);
        // Boot up the device
        console.log("Booting simulator");
        xcode.simctl.boot(deviceId);
        console.log("Simulator is booting");
        xcode.simctl.bootstatus(deviceId);
        console.log("Simulator is ready 🚀");
    } else {
        throw new Error(`Unexpected platform: '${platform}'`);
    }
}

async function runApp(platform, junitFilePath, isWatching) {
    if (isWatching) {
        console.log("Running in watch-mode");
    }

    const mochaConfig = {};

    // Check if an argument for junit path was requested
    if (junitFilePath) {
        mochaConfig.reporter = "mocha-junit-reporter";
        mochaConfig.reporterOptions = {
            mochaFile: junitFilePath,
        };
    }

    // Create and start a server
    const server = new MochaRemoteServer(mochaConfig, {
        // Accept connections only from the expected platform, to prevent cross-talk when both emulators are open
        id: platform,
        runOnConnection: isWatching,
    });
    await server.start();

    // Spawn a react-native metro server
    const metro = rn.async("start" /*"--verbose", "--reset-cache"*/);
    // Kill metro when the process is killed
    process.on("exit", (code) => {
        metro.kill("SIGHUP");
    });
    // Close the runner if metro closes unexpectedly
    metro.on("close", (code) => {
        console.error(`Metro server closed (code = ${code})`);
        if (code !== 0) {
            process.exit(code);
        }
    });

    // Ensure the simulator is booted and ready for the app to start
    ensureSimulator(platform);

    console.log("Starting the app");
    if (platform === "android") {
        // Ask React Native to run the android app
        rn.sync("run-android", "--no-packager");
    } else if (platform === "ios") {
        // Ask React Native to run the ios app
        rn.sync("run-ios", "--no-packager", "--simulator", IOS_DEVICE_NAME);
    } else {
        throw new Error(`Unexpected platform: '${platform}'`);
    }

    // Set an interval that calls "react-native run-ios" every minute to make it refetch the bundle if it fails
    const retryInterval = setInterval(() => {
        if (platform === "ios") {
            console.log("Retrying starting the iOS app");
            // Ask React Native to re-run the ios app
            rn.sync("run-ios", "--no-packager", "--simulator", IOS_DEVICE_NAME);
        }
    }, 60000);

    if (isWatching) {
        clearInterval(retryInterval);
    } else {
        // Run tests with a 5 minute timeout
        return timeout(
            new Promise((resolve) => {
                console.log("Running tests 🏃‍");
                server.run(resolve);
            }),
            60000 * 5,
        ).finally(() => {
            clearInterval(retryInterval);
        });
    }
}

Yargs.command(
    "$0 <platform>",
    "Run the integration tests",
    (yargs) => {
        return yargs
            .positional("platform", {
                type: "string",
                choices: ["ios", "android"],
            })
            .option("junit-output-path", {
                type: "string",
                coerce: path.resolve,
            })
            .option("watch", {
                alias: "w",
                type: "boolean",
            });
    },
    (args) => {
        const isWatching = args.watch;
        runApp(args.platform, args["junit-output-path"], isWatching).then(
            (failures) => {
                if (isWatching) {
                    console.log("Waiting for mocha-remote-client to connect");
                } else {
                    console.log(`Completed running (${failures} failures)`);
                    // Exit with a non-zero code if we had failures
                    process.exit(failures > 0 ? 1 : 0);
                }
            },
            (err) => {
                if (err instanceof TimeoutError) {
                    console.error("Timed out running tests");
                } else {
                    console.error(err.stack);
                }
                process.exit(2);
            },
        );
    },
).help().argv;
