#!/bin/bash

set -o pipefail
set -e

PATH="/opt/android-sdk-linux/platform-tools:$PATH"

# Inform the prepublish script to build Android modules.
REALM_BUILD_ANDROID=1 npm install realm realm-tests

cp ../../src/object-store/tests/query.json node_modules/realm-tests/query-tests.json

echo "Start Emulator"
emulator -verbose -avd react_native_tests_23 &

sleep 10

echo "Waiting for emulator to start"
while [ "`adb -e shell getprop sys.boot_completed | tr -d '\r' `" != "1" ] ; do sleep 1; done
echo "Emulator started"

echo "Uninstalling old apk"
adb -e uninstall io.realm.react.testapp || true

echo "Reversing port for physical device"
adb -e reverse tcp:8081 tcp:8081

echo "Building Release APK"
pushd android && ./gradlew assembleRelease

echo "Installing APK"
adb -e install app/build/outputs/apk/app-release.apk

echo "Starting the Main Activity"
adb -e shell am start -n io.realm.react.testapp/.MainActivity

popd
