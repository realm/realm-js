#!/usr/bin/env bash

# Keep this version of Electron up-to-date with the major version used in the package.json
ELECTRON_VERSION="v4.0.0";
# Rebuild the Realm package
cd node_modules/realm;
HOME=~/.electron-gyp npx node-pre-gyp rebuild --build-from-source --runtime=electron --target=$ELECTRON_VERSION --arch=x64 --dist-url=https://atom.io/download/electron
