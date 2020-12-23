#!/bin/bash

set -o pipefail
set -e

PATH="/opt/android-sdk-linux/platform-tools:$PATH"

if adb shell pm list packages | grep -q io.realm.react.testapp; then
    echo "Uninstalling old apk"
    adb uninstall io.realm.react.testapp
fi

echo "Running test application"
npx react-native run-android

# granting permissions after react-native run-android since the package needs to be installed
echo "Granting permission to write to sdcard"
adb shell pm grant io.realm.react.testapp android.permission.WRITE_EXTERNAL_STORAGE
