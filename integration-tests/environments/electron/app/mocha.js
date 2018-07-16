const Mocha = require("mocha");
const { resolve } = require("path");

const mocha = new Mocha({
    useColors: true,
});

// Sets the root suite title to include the process type
mocha.suite.title = `Electron ${process.type === "renderer" ? "renderer" : "main"} process`;

// Set the Realm global for the tests to use
global.Realm = require("realm");

const testIndexPath = resolve(__dirname, "../../../tests/src/index.js");
mocha.addFile(testIndexPath);

module.exports = mocha;
