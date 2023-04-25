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

const rn = require("./react-native-cli");
const android = require("./android-cli");
const xcode = require("./xcode-cli");
const logcat = require("./logcat");

const IOS_DEVICE_NAME = "realm-js-integration-tests";
const IOS_DEVICE_TYPE_ID = "com.apple.CoreSimulator.SimDeviceType.iPhone-14";

const { MOCHA_REMOTE_PORT, PLATFORM, SPAWN_LOGCAT, SKIP_RUNNER, RETRY_DELAY, RETRIES } = process.env;

const reversedAndroidPorts = [
  // Metro server
  8081,
  // Realm App Importer
  8091,
  // Local BaaS server
  9090,
];

// Ensure the device can access the Mocha Remote Server
if (MOCHA_REMOTE_PORT) {
  reversedAndroidPorts.push(MOCHA_REMOTE_PORT);
}

// If attempting a retry, wait for 1 minute before retrying
const retryDelay = parseInt(RETRY_DELAY || "60000", 10);
// Defaulting to zero retries
const retries = parseInt(RETRIES || 0, 10);

if (typeof PLATFORM !== "string") {
  throw new Error("Expected a 'PLATFORM' environment variable");
}

function ensureAndroidReversePorts() {
  const devices = android.adb.devices();
  const activeDevices = devices.filter(({ state }) => state === "device");
  if (activeDevices.length === 0) {
    throw new Error("Missing an active device: Attach a device via USB or start an emulator");
  } else {
    for (const port of reversedAndroidPorts) {
      android.adb.reverseServerPort(port);
    }
  }
}

/**
 * Ensure a simulator is created and booted
 */
function ensureSimulator() {
  if (PLATFORM === "android") {
    ensureAndroidReversePorts();
  } else if (PLATFORM === "ios") {
    const version = xcode.xcrun("--version").stdout.trim();
    console.log(`Using ${version}`);

    // Determine if the system supports the device type id
    const { devicetypes } = xcode.simctl.list("devicetypes");
    const deviceType = devicetypes.find(({ identifier }) => identifier === IOS_DEVICE_TYPE_ID);
    if (!deviceType) {
      throw new Error(`System doesn't have the "${IOS_DEVICE_TYPE_ID}" device type`);
    }

    // Shutdown all booted simulators (as they might interfeer by loading and executing the Metro bundle)
    // xcode.simctl.shutdown("all");
    // TODO: Investigate if we have to shut down anything at all
    // xcode.simctl.shutdown(IOS_DEVICE_NAME);

    // Determine if the device exists and has the correct IOS_DEVICE_TYPE_ID and latest runtime
    const { devices: devicesByType } = xcode.simctl.list("devices", "available");
    const availableDevices = [].concat(...Object.keys(devicesByType).map((type) => devicesByType[type]));
    // Filter devices, so we're only focussing on devices of the expected name
    const devices = availableDevices.filter(({ name }) => name === IOS_DEVICE_NAME);

    if (devices.length > 0) {
      // Use the first device with the expected name
      return devices[0].udid;
    }

    const { runtimes } = xcode.simctl.list("runtimes", "ios");
    const [runtime] = runtimes.filter((r) => r.isAvailable);
    if (!runtime) {
      throw new Error("No available iOS runtimes");
    }
    // Create the device
    const { stdout } = xcode.simctl.create(IOS_DEVICE_NAME, IOS_DEVICE_TYPE_ID, runtime.identifier);
    const deviceId = stdout.trim();
    console.log(`Created simulator device (id = ${deviceId})`);
    // Boot up the device
    console.log("Booting simulator");
    xcode.simctl.boot(deviceId);
    console.log("Simulator is booting");
    xcode.simctl.bootstatus(deviceId);
    console.log("Simulator is ready 🚀");
  } else if (PLATFORM === "catalyst") {
    const version = xcode.xcrun("--version").stdout.trim();
    console.log(`Using ${version}`);

    // Retreive this mac's device id
    const myMacDeviceId = xcode.getMyMacDeviceId();

    if (myMacDeviceId === null) {
      throw new Error(`Unable to determine this Mac's device id`);
    }

    console.log(`Successfully determine this Mac's device id ${myMacDeviceId}`);
  } else {
    throw new Error(`Unexpected platform: '${PLATFORM}'`);
  }
}

async function run(spawnLogcat, retries, retryDelay) {
  // Ensure the simulator is booted and ready for the app to start
  ensureSimulator();

  console.log("Starting the app");
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (PLATFORM === "android") {
      // Start the log cat (skipping any initial pid from an old run)
      if (spawnLogcat) {
        logcat.start("com.realmreactnativetests", true).catch(console.error);
      }
      // Ask React Native to build and run the app
      // Using --active-arch-only as per https://reactnative.dev/docs/build-speed#build-only-one-abi-during-development-android-only
      rn.sync("run-android", "--no-packager", "--active-arch-only");
    } else if (PLATFORM === "ios") {
      // Ask React Native to build and run the app
      rn.sync("run-ios", "--no-packager", "--simulator", IOS_DEVICE_NAME);
    } else if (PLATFORM === "catalyst") {
      const myMacDeviceId = xcode.getMyMacDeviceId();
      // Ask React Native to build and run the app
      rn.sync("run-ios", "--no-packager", "--udid", myMacDeviceId);
    } else {
      throw new Error(`Unexpected platform: '${PLATFORM}'`);
    }
    if (attempt < retries) {
      console.log(`Waiting ${retryDelay}ms before retrying`);
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
      console.log(`Tests didn't complete while waiting for ${retryDelay}ms. Retrying!`);
    } else {
      console.log("This was the final attempt to launch the app ...");
    }
  }
}

function optionalStringToBoolean(value) {
  return typeof value === "string" ? value === "true" : value;
}

if (module.parent === null) {
  if (SKIP_RUNNER === "true") {
    if (PLATFORM === "android") {
      ensureAndroidReversePorts();
    }
    console.log("Skipping the runner - you're on your own");
    process.exit(0);
  }

  const spawnLogcat = optionalStringToBoolean(SPAWN_LOGCAT);
  run(spawnLogcat, retries, retryDelay).catch((err) => {
    console.error(err.stack);
    process.exit(1);
  });
}
