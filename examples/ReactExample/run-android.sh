#!/bin/bash

set -o pipefail
set -e

PATH="/opt/android-sdk-linux/platform-tools:$PATH"

# Inform the prepublish script to build Android modules.
npm install realm

adb reverse tcp:8081 tcp:8081

react-native run-android
