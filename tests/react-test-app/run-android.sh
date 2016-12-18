#!/bin/bash

set -o pipefail
set -e

PATH="/opt/android-sdk-linux/platform-tools:$PATH"

# Inform the prepublish script to build Android modules.
REALM_BUILD_ANDROID=1 npm install realm realm-tests

cp ../../src/object-store/tests/query.json node_modules/realm-tests/query-tests.json

echo "Uninstalling old apk"
adb uninstall io.realm.react.testapp || true

echo "Reversing port for physical device"
adb reverse tcp:8081 tcp:8081

echo "Building Release APK"
pushd android && ./gradlew assembleRelease

echo "Installing APK"
adb install app/build/outputs/apk/app-release.apk

sleep 10

echo "Starting the Main Activity"
adb -e shell am start -n io.realm.react.testapp/.MainActivity

popd
