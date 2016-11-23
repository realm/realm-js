var package = require("../../../package.json");
var spawn = require('child_process').spawn;

var reactNative = !!package.dependencies["react-native"];

if (!reactNative) {
  // Not a React Native install. Must be either Node or Electron.

  if (process.platform === 'win32') {
    console.error('ERROR: Realm is not yet supported on Windows');
    process.exit(-1);
  }

  // Execute "node-pre-gyp install --fallback-to-build
  var pregyp = spawn('node-pre-gyp', ['install', '--fallback-to-build']);
  pregyp.stdout.on('data', function (data) { console.log(data.toString()); });
  pregyp.stderr.on('data', function (data) { console.error(data.toString()); });
}

