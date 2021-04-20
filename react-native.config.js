"use strict";

const path = require("path");

module.exports = {
  // config for a library is scoped under "dependency" key
  dependency: {
    platforms: {
      android: {
        sourceDir: './react-native/android'
      },
      ios: {
        podspecPath: path.resolve(__dirname, 'RealmJS.podspec'),
        sharedLibraries: [
          'libc++',
          'libz'
        ]
      },
    },
  }
};
