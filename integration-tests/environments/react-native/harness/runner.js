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
const cp = require("child_process");
const puppeteer = require("puppeteer");

const rn = require("./react-native-cli");
const android = require("./android-cli");
const xcode = require("./xcode-cli");
const puppeteerLog = require("./puppeteer-log");
const logcat = require("./logcat");

const IOS_DEVICE_NAME = "realm-js-integration-tests";
const IOS_DEVICE_TYPE_ID = "com.apple.CoreSimulator.SimDeviceType.iPhone-11";

const { MOCHA_REMOTE_PORT, PLATFORM, HEADLESS_DEBUGGER, SPAWN_LOGCAT, SKIP_RUNNER } = process.env;

if (typeof PLATFORM !== "string") {
  throw new Error("Expected a 'PLATFORM' environment variable");
}

/**
 * Ensure a simulator is created and booted
 */
function ensureSimulator() {
  if (PLATFORM === "android") {
    const devices = android.adb.devices();
    const activeDevices = devices.filter(({ state }) => state === "device");
    if (activeDevices.length === 0) {
      throw new Error("Missing an active device: Attach a device via USB or start an emulator");
    } else {
      // Ensure the device can access the mocha remote server
      if (MOCHA_REMOTE_PORT) {
        android.adb.reverseServerPort(MOCHA_REMOTE_PORT);
      }
      // Ensure the Realm App Importer is reachable
      android.adb.reverseServerPort(8091);
    }
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

async function launchDebugger(headless) {
  try {
    const browser = await puppeteer.launch({ headless });
    const page = await browser.newPage();
    page.on("console", puppeteerLog.handleConsole);
    await page.goto("http://localhost:8081/debugger-ui/");
  } catch (err) {
    if (err.message.startsWith("net::ERR_CONNECTION_REFUSED")) {
      console.log("Metro was not ready: Retrying in 1s");
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return launchDebugger();
    } else {
      throw err;
    }
  }
}

async function run(headless, spawnLogcat) {
  // Ensure the simulator is booted and ready for the app to start
  ensureSimulator();

  // Connect the debugger, right away
  if (typeof headless === "boolean") {
    await launchDebugger(headless);
  }

  console.log("Starting the app");
  if (PLATFORM === "android") {
    // Start the log cat (skipping any initial pid from an old run)
    if (spawnLogcat) {
      logcat.start("com.realmreactnativetests", true).catch(console.error);
    }
    // Ask React Native to run the android app
    rn.sync("run-android", "--no-packager");
  } else if (PLATFORM === "ios") {
    // Ask React Native to run the ios app
    rn.sync("run-ios", "--no-packager", "--simulator", IOS_DEVICE_NAME);
  } else if (PLATFORM === "catalyst") {
    // Ask React Native to run the ios app
    const myMacDeviceId = xcode.getMyMacDeviceId();

    // This will just build the app, but not launch it
    rn.sync("run-ios", "--no-packager", "--udid", myMacDeviceId);

    // TODO: When the PR (https://github.com/react-native-community/cli/pull/1449) is live in React-Native
    // the following lines can be removed

    // This will retrieve the build information and launch the app
    const buildSettings = cp.execFileSync(
      "xcodebuild",
      [
        "-workspace",
        "./ios/RealmReactNativeTests.xcworkspace",
        "-scheme",
        "RealmReactNativeTests",
        "-sdk",
        "macosx",
        "-configuration",
        "Debug",
        "-showBuildSettings",
        "-json",
      ],
      { encoding: "utf8" },
    );
    const settings = JSON.parse(buildSettings);

    let targetExecutable = "";

    for (const i in settings) {
      const wrapperExtension = settings[i].buildSettings.WRAPPER_EXTENSION;

      if (wrapperExtension === "app") {
        const targetBuildDir = `${settings[i].buildSettings.TARGET_BUILD_DIR}-maccatalyst`;
        const executableFolderPath = settings[i].buildSettings.EXECUTABLE_FOLDER_PATH;
        targetExecutable = `${targetBuildDir}/${executableFolderPath}/RealmReactNativeTests`;
      }
    }

    console.log({ targetExecutable });

    if (targetExecutable) {
      console.log("about to spawn1");
      const appProcess = cp.spawn(targetExecutable, [], {
        detached: true,
        stdio: "ignore",
      });
      console.log("about to spawn2");
      appProcess.unref();
      console.log("about to spawn3");

      setInterval(() => {
        cp.exec("ps aux | grep RealmReactNativeTests", (error, stdout) => console.log(stdout));
      }, 5000);
    } else {
      console.warn({ buildSettings });
      console.log("Failed to determine executable");
      throw new Error("Failed to determine executable");
    }
  } else {
    throw new Error(`Unexpected platform: '${PLATFORM}'`);
  }
}

function optionalStringToBoolean(value) {
  return typeof value === "string" ? value === "true" : value;
}

if (module.parent === null) {
  if (SKIP_RUNNER === "true") {
    console.log("Skipping the runner - you're on your own");
    process.exit(0);
  }
  const headlessDebugger = optionalStringToBoolean(HEADLESS_DEBUGGER);
  const spawnLogcat = optionalStringToBoolean(SPAWN_LOGCAT);
  run(headlessDebugger, spawnLogcat).catch((err) => {
    console.error(err.stack);
    process.exit(1);
  });
}
