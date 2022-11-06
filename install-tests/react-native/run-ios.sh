#!/usr/bin/env bash

# This file is no longer used and only stored here for future reference into building with ccache enabled
# Use "npm run cli" instead

set -e

APP_DIR="$PWD/`dirname $0`/app"
PROJECT_ROOT=$APP_DIR/../../..

# Manually delete any app previously created
if [ ! -d "$APP_DIR" ]; then
  echo "Couldn't locate an app directory, did you run install.sh?"
  exit 1
fi

# Determine the simulator's UDID
DEVICE_UDID=`npx ios-simulator -n 'iPhone 13'`
# Open the simulator
open -a Simulator --args -CurrentDeviceUDID $DEVICE_UDID
# Await the boot of the device
xcrun simctl bootstatus $DEVICE_UDID

cd $APP_DIR

# Build the app (ccache enabled)
RCT_NO_LAUNCH_PACKAGER=1 xcodebuild \
  -workspace ios/ReactNativeTestApp.xcworkspace \
  -configuration Debug \
  -scheme ReactNativeTestApp \
  -derivedDataPath ./build \
  -destination id=$DEVICE_UDID \
  CC="$PROJECT_ROOT/scripts/ccache-clang.sh" \
  CXX="$PROJECT_ROOT/scripts/ccache-clang++.sh"

# Install the app onto the device
APP_BUNDLE_ID=org.reactjs.native.example.ReactNativeTestApp
APP_BUILD_PATH=./build/Build/Products/Debug-iphonesimulator/ReactNativeTestApp.app
xcrun simctl install $DEVICE_UDID $APP_BUILD_PATH

# Run the app: Starting the listening server, Metro bundler and delayed launch of the app.
npx concurrently --kill-others --success "first" --names "listen,metro,app" \
  "node ../listen.js" \
  "react-native start" \
  "sleep 5; xcrun simctl launch --console-pty $DEVICE_UDID $APP_BUNDLE_ID"
