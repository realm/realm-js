const path = require('path');
module.exports = require('@realm/metro-config')({
  projectRoot: __dirname,
  watchFolders: [path.resolve(__dirname, '..')],
});
