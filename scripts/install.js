/* eslint-disable no-console */
'use strict';

var spawn = require('child_process').spawn;

var isReactNative = false;
try {
  require.resolve('react-native');
  // If the above opeation didn't throw, this project has react native as a dependency.
  isReactNative = true;
} catch(e) {}

// Not a React Native install. Must be either Node or Electron.
var isNode = !isReactNative;

if (process.platform === 'win32') {
  if (isNode) {
    console.error('ERROR: Realm is not yet supported for Node on Windows');
    process.exit(-1);
  } else {
    console.warn('NOTE: Realm is not supported for Node on Windows, so you will not be able to run unit tests that rely on Realm with a node-based runner.');
  }
} else {
  // Execute "node-pre-gyp install --fallback-to-build
  var pregyp = spawn('node-pre-gyp', ['install', '--fallback-to-build']);
  pregyp.stdout.on('data', function (data) { console.log(data.toString()); });
  pregyp.stderr.on('data', function (data) { console.error(data.toString()); });
  pregyp.on('exit', function (code) { process.exit(code); });
}
