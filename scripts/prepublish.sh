#!/bin/bash

set -e
set -o pipefail

cd "$(dirname "$0")/.."

if [ -n "$SKIP_ANDROID_BUILD" ]; then
  echo 'Skipped building Android module'
else
  rm -rf android
  (cd react-native/android && ./gradlew publishAndroid)
fi
