"use strict";

const path = require("path");
const { Application } = require("spectron");

let ELECTRON_PATH = path.join(__dirname, "node_modules", ".bin", "electron");
if (process.platform === "win32") {
    ELECTRON_PATH += ".cmd";
}
const MAIN_PATH = path.join(__dirname, "app", "main.js");
const POLL_LOG_DELAY = 100;

const doneMatcher = /^Electron process stopped, with status ([-\d]+)$/;

const app = new Application({
    path: ELECTRON_PATH,
    args: [ MAIN_PATH ].concat(process.argv.slice(2))
});

function loop(callback, delay) {
    return new Promise((resolve, reject) => {
        const timeout = setInterval(() => {
            callback((result) => {
                // Clear the timeout and resolve ...
                clearTimeout(timeout);
                resolve(result);
            }).then(undefined, (err) => {
                // Clear the timeout and reject ...
                clearTimeout(timeout);
                reject(err);
            });
        }, delay);
    });
}

async function run() {
    await app.start();
    await app.client.waitUntilWindowLoaded();
    // Start polling and printing the logs
    await loop(async (resolve) => {
        const mainMessages = await app.client.getMainProcessLogs();
        for (const message of mainMessages) {
            const doneTest = doneMatcher.exec(message);
            console.log(message);
            if(doneTest) {
                const statusCode = parseInt(doneTest[1], 10);
                resolve(statusCode);
                return;
            }
        }
    }, POLL_LOG_DELAY);
}

run().then((statusCode) => {
    // Exit with the same status as the Electron process
    process.exit(statusCode);
}, (error) => {
    // Log any failures
    console.error("Test harness failure:", error.message);
    process.exit(1);
});
