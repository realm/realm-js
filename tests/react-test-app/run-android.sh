#!/bin/bash

set -o pipefail
set -e

PATH="/opt/android-sdk-linux/platform-tools:$PATH"

rm -rf node_modules/realm node_modules/realm-tests
npm install realm realm-tests

cp ../../src/object-store/parser/queryTests.json node_modules/realm-tests/query-tests.json

echo "Reversing port for physical device"
adb reverse tcp:8081 tcp:8081
adb forward tcp:8082 tcp:8082
react-native run-android
echo "Unlocking device"
adb shell input keyevent 82
