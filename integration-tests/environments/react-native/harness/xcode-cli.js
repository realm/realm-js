const cp = require("child_process");

function xcrun(...args) {
    const p = cp.spawnSync("xcrun", args, { encoding: "utf8" });
    if (p.status !== 0) {
        throw new Error(`Failed running "xcrun ${args.join(" ")}" (status = ${p.status}):\n${p.stderr.trim()}`);
    } else {
        return p;
    }
}

function simctl(...args) {
    return xcrun("simctl", ...args);
}

/**
 * List available devices, device types, runtimes, or device pairs
 * @param {string} type One of devices, devicetypes, runtimes or pairs
 */
function list(type, searchterm, asJson = true) {
    const args = [ type ];
    if (searchterm && !type) {
        throw new Error("You must provide a type when providing a search term");
    } else if (searchterm) {
        args.push(searchterm);
    }
    if (asJson) {
        args.push("--json");
    }
    const p = simctl("list", ...args);
    if (asJson) {
        return JSON.parse(p.stdout);
    } else {
        return p;
    }
}

/**
 * Create a new device
 * @param {string} name The name of the new device
 * @param {string} deviceTypeId The type of device to use (run `xcrun simctl list devicetypes` to get these)
 * @param {string} runtimeId The id of the runtime of the new device (run `xcrun simctl list runtimes` to get these)
 */
function create(name, deviceTypeId, runtimeId) {
    return simctl("create", name, deviceTypeId, runtimeId);
}

/**
 * Delete spcified devices, unavailable devices, or all devices.
 * @param {string} device Device to delete
 */
function deleteDevice(device) {
    return simctl("delete", device);
}

/**
 * Erase a device's contents and settings.
 * @param {string} device Device to erase
 */
function erase(device) {
    return simctl("erase", device);
}

/**
 * Boot up a device
 * @param {string} device Device to boot
 */
function boot(device) {
    return simctl("boot", device);
}

/**
 * Shutdown a device
 * @param {string} device Device to shut down
 */
function shutdown(device) {
    return simctl("shutdown", device);
}

/**
 * Terminate an app running on a device
 * @param {string} device Device on which to terminate app
 * @param {string} appBundleIdentifier The bundle id of the app to terminate
 */
function terminate(device, appBundleIdentifier) {
    return simctl("terminate", device, appBundleIdentifier);
}

/**
 * Launch an app on the device
 * @param {string} device Device to launch on
 * @param {string} appBundleIdentifier The bundle id of the app to launch
 */
function launch(device, appBundleIdentifier) {
    return simctl("launch", device, appBundleIdentifier);
}

/**
 * Opens a URL in the device browser
 * @param {string} device 
 * @param {string} url 
 */
function openUrl(device, url) {
    return simctl("openurl", device, url);
}

module.exports = {
    xcrun,
    simctl: {
        list,
        create,
        delete: deleteDevice,
        erase,
        boot,
        shutdown,
        terminate,
        launch,
        openUrl,
    }
};
