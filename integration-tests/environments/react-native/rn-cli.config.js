const { resolve } = require("path");
// @see https://www.npmjs.com/package/node-libs-react-native#usage-with-react-native-packager
const extraNodeModules = require("node-libs-react-native");
// Provide a mocked and unusable implementation of the core node.js "fs" module
extraNodeModules.fs = resolve(__dirname, "harness/mocked-fs.js");
// Provide the modules to the bundler
module.exports = { extraNodeModules };
