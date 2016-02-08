#!/bin/bash

set -e
set -o pipefail

symlink() {
  [ -e "$(basename "$1")" ] || ln -s "$1"
}

cd "$(dirname "$0")/.."

# A top-level "android" directory is expected by `react-native link`
symlink react-native/android

# NPM doesn't support publishing symlinks, so these must be re-created
cd react-native/android/app/src/main/jni
symlink ../../../../../../src
symlink ../../../../../../vendor
