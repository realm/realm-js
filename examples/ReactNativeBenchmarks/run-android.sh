#!/bin/bash

set -o pipefail
set -e

PATH="/opt/android-sdk-linux/platform-tools:$PATH"

rm -rf node_modules/realm
npm install realm

adb reverse tcp:8081 tcp:8081
adb forward tcp:8082 tcp:8082

react-native run-android
