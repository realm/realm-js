"use strict";

module.exports = {
  // config for a library is scoped under "dependency" key
  dependency: {
    platforms: {
      ios: {
        project: 'react-native/ios/RealmReact.xcodeproj',
        sharedLibraries: [
          'libc++',
          'libz'
        ]
      },
    },
  }
};
