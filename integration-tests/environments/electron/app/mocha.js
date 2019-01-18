const { MochaRemoteClient } = require("mocha-remote-client");
const { resolve } = require("path");

module.exports = (id) => {
    return new MochaRemoteClient({
        id,
        whenInstrumented: mocha => {
            // Sets the root suite title to include the process type
            mocha.suite.title = `Electron ${id} process`;
            // Set the Realm global for the tests to use
            global.Realm = require("realm");
            // Add the integration test suite
            const testIndexPath = resolve(__dirname, "../../../tests/src/index.js");
            mocha.addFile(testIndexPath);
        },
    });
};
