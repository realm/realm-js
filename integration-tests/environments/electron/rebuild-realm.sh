#!/usr/bin/env bash

# Determine the current electron version
ELECTRON_VERSION=`node -e "console.log(require('electron/package.json').version)"`;

export npm_config_target="${ELECTRON_VERSION}"
export npm_config_disturl="https://atom.io/download/electron"
export npm_config_runtime="electron"
export npm_config_devdir="${HOME}/.electron-gyp"

# Rebuild the Realm package
cd node_modules/realm;
# Rebuild the native module
npx node-pre-gyp rebuild --realm_enable_sync
