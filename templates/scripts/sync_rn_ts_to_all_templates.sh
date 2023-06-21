#!/bin/bash

# This script converts the TypeScript template apps to plain JavaScript, using detype
# (https://www.npmjs.com/package/detype) to preserve comments and formatting
# (which tsc does not do)

set -e
set -o pipefail

sync_ts_app_code() {
  pushd $2
  rm -rf app
  popd
  cp -R $1/app $2/app
}

sync_ts_app_code "../../example" "../react-native-template/template"
sync_ts_app_code "../../example" "../expo-template"
