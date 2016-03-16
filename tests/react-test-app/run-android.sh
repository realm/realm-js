#!/bin/bash

set -o pipefail
set -e

PATH="/opt/android-sdk-linux/platform-tools:$PATH"

# Inform the prepublish script to build Android modules.
REALM_BUILD_ANDROID=1 npm install realm realm-tests

cp ../../src/object-store/tests/query.json node_modules/realm-tests/query-tests.json

echo "Reversing port for physical device"
adb reverse tcp:8081 tcp:8081

react-native run-android

echo "Unlocking device"
adb shell input keyevent 82
