#!/bin/bash

set -o pipefail
set -e

PATH="/opt/android-sdk-linux/platform-tools:$PATH"

if [ -n "$REALM_BUILD_ANDROID" ]; then
    echo "Realm is already installed" # by inoking test.sh previously for example

else
    # Inform the prepublish script to build Android modules.
    REALM_BUILD_ANDROID=1 npm install realm realm-tests
fi


cp ../../src/object-store/tests/query.json node_modules/realm-tests/query-tests.json

if adb shell pm list packages | grep -q io.realm.react.testapp; then
    echo "Uninstalling old apk"
    adb uninstall io.realm.react.testapp
fi

echo "Reversing port for physical device"
adb reverse tcp:8081 tcp:8081

echo "Reversing port for Realm Object Server"
adb reverse tcp:9080 tcp:9080

echo "Building Release APK"
pushd android && ./gradlew assembleRelease

echo "Installing APK"
adb install app/build/outputs/apk/release/app-release.apk

echo "Starting the Main Activity"
adb shell am start -n io.realm.react.testapp/.MainActivity

popd
