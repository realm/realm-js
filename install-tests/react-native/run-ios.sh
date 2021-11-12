#!/usr/bin/env bash

set -e

APP_DIR="$PWD/`dirname $0`/app"

# Manually delete any app previously created
if [ ! -d "$APP_DIR" ]; then
  echo "Couldn't locate an app directory, did you run install.sh?"
  exit 1
fi

# Determine the simulator's UDID
DEVICE_UDID=`npx -y ios-simulator -n 'iPhone 13'`
# Open the simulator
open -a Simulator --args -CurrentDeviceUDID $DEVICE_UDID
# Await the boot of the device
xcrun simctl bootstatus $DEVICE_UDID

cd $APP_DIR
# Run the app
npx react-native run-ios --udid $DEVICE_UDID
# Run the app again, as a work around an unidentified lunching issue on CI
if [ "$CI" == "true" ]; then
  npx react-native run-ios --udid $DEVICE_UDID
fi
# Start listening for the app
node ../listen.js
