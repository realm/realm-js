"use strict";

// Disables security warnings which spams the console
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = true;

const remote = require("electron").remote;

// Use the main process console when logging
global.console = remote.getGlobal("console");
// Get the options available for the renderer
const { runIn } = remote.getGlobal("options");
// If we're supposed to run in the renderer, start the mocha remote client
if (runIn === "renderer") {
    require("./mocha.js")("renderer");
}
