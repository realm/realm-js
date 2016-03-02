#!/bin/bash

set -o pipefail
set -e

PATH="/opt/android-sdk-linux/platform-tools:$PATH"

npm install realm

adb reverse tcp:8081 tcp:8081

react-native run-android
