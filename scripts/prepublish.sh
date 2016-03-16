#!/bin/bash

set -e
set -o pipefail

cd "$(dirname "$0")/.."

if [ -n "$REALM_BUILD_ANDROID" ]; then
  rm -rf android
  (cd react-native/android && ./gradlew publishAndroid)
fi
