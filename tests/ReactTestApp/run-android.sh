#!/bin/bash

set -o pipefail
set -e

PATH="/opt/android-sdk-linux/platform-tools:$PATH"

if adb shell pm list packages | grep -q com.reacttestapp; then
    echo "Uninstalling old apk"
    adb uninstall com.reacttestapp
fi

echo "Running test application"
npx react-native run-android

# granting permissions after react-native run-android since the package needs to be installed.
# permissions are needed so we can write the test output to the sdcard
echo "Granting permission to write to sdcard"
adb shell pm grant com.reacttestapp android.permission.WRITE_EXTERNAL_STORAGE