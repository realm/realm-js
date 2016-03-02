#!/bin/bash

set -o pipefail
set -e

PATH="/opt/android-sdk-linux/platform-tools:$PATH"

# Inform the prepublish script to build Android modules.
REALM_BUILD_ANDROID=1 npm install realm

adb reverse tcp:8081 tcp:8081

react-native run-android
