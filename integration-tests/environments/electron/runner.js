"use strict";

const path = require("path");
const { Application } = require("spectron");
const { MochaRemoteServer } = require("mocha-remote-server");

let ELECTRON_PATH = path.join(__dirname, "node_modules", ".bin", "electron");
if (process.platform === "win32") {
    ELECTRON_PATH += ".cmd";
}
const MAIN_PATH = path.join(__dirname, "app", "main.js");

async function printLogs(app) {
    const messages = await app.client.getMainProcessLogs();
    for (const message of messages) {
        console.log(message);
    }
}

async function run() {
    const runIn = process.argv[2];
    // Start the mocha remote server
    const server = new MochaRemoteServer({}, {
        id: runIn,
        port: 0,
    });
    await server.start();
    // Create a spectron handle for the application
    const app = new Application({
        path: ELECTRON_PATH,
        args: [ MAIN_PATH, server.getUrl(), runIn ],
    });
    // Start the app
    await app.start();
    await app.client.waitUntilWindowLoaded();
    // Print any log messages, these may contain errors relevant for the harness
    printLogs(app);
    // Tell the client to run its tests
    const failures = await new Promise((resolve, reject) => {
        server.run(resolve);
    });
    // Print any logs from the process
    if (app.isRunning()) {
        // Print the standard out from the process
        printLogs(app);
    }
    await app.stop();
    // Return the number of failed tests
    return failures;
}

run().then(failures => {
    // Exit with the same status as the Electron process
    process.exit(failures > 0 ? 1 : 0);
}, (error) => {
    // Log any failures
    console.error("Test harness failure:", error.stack);
    process.exit(1);
});
