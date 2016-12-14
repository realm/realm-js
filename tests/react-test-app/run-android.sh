#!/bin/bash

set -o pipefail
set -e

PATH="/opt/android-sdk-linux/platform-tools:$PATH"

# Inform the prepublish script to build Android modules.
REALM_BUILD_ANDROID=1 npm install realm realm-tests

cp ../../src/object-store/tests/query.json node_modules/realm-tests/query-tests.json

adb uninstall io.realm.react.testapp || true

echo "Reversing port for physical device"
adb reverse tcp:8081 tcp:8081

ls -alh ../../react-native/android/src/main/jni/src/object-store/.dockerignore
react-native run-android --debug

echo "Unlocking device"
# sometimes on CI the application is not on the foreground
adb shell input keyevent 82
adb shell input text 1234 && adb shell input keyevent 66

sleep 1
echo "Starting the Main Activity"
adb shell am start -n io.realm.react.testapp/.MainActivity
