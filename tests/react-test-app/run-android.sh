#!/bin/bash

set -o pipefail
set -e

PATH="/opt/android-sdk-linux/platform-tools:$PATH"

if adb shell pm list packages | grep -q io.realm.react.testapp; then
    echo "Uninstalling old apk"
    adb uninstall io.realm.react.testapp
fi

echo "Reversing port for physical device"
adb reverse tcp:8081 tcp:8081

echo "Building Release APK"
pushd android && ./gradlew assembleRelease --info

echo "Installing APK"
adb install app/build/outputs/apk/release/app-release.apk

echo "Starting the Main Activity"
adb shell am start -n io.realm.react.testapp/.MainActivity

popd
