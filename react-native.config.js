"use strict";

const path = require("path");

module.exports = {
  // config for a library is scoped under "dependency" key
  dependency: {
    platforms: {
      ios: {
        podspecPath: path.resolve(__dirname, 'Realm.podspec'),
        sharedLibraries: [
          'libc++',
          'libz'
        ]
      },
    },
  }
};
