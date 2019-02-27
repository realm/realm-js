#!/usr/bin/env bash

# Determine the current electron version
ELECTRON_VERSION=`node -e "console.log(require('electron/package.json').version)"`;
# Rebuild the Realm package
cd node_modules/realm;
HOME=~/.electron-gyp npx node-pre-gyp rebuild --build-from-source --runtime=electron --target=$ELECTRON_VERSION --arch=x64 --dist-url=https://atom.io/download/electron
