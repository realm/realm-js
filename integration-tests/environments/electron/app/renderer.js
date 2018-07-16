"use strict";

// Disables security warnings which spams the console
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = true;
const RENDERER_FAILURE_EXIT_CODE = 3;

const remote = require("electron").remote;

// Use the main process console when logging
global.console = remote.getGlobal("console");

const options = remote.getGlobal("options");
if (options.runIn.indexOf("renderer") !== -1) {
    const mocha = require("./mocha.js");
    // TODO: Implement a better reporter which sends events over Electron IPC
    mocha.run(failures => {
        // We use a timeout to prevent the app from endlessly restarting if the tests are fast
        setTimeout(() => {
            remote.process.exit(failures ? RENDERER_FAILURE_EXIT_CODE : 0);
        }, 1000);
    });
}
