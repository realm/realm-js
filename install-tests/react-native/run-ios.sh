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
# Retry 30 * 60 * 1000
RETRY_TIMEOUT=1800000
# Run the app
npx concurrently --names "listen,rn" \
  "node ../listen.js" \
  "npx retry --retries 5 --factor 1 --max-timeout $RETRY_TIMEOUT -- react-native run-ios --udid $DEVICE_UDID"
