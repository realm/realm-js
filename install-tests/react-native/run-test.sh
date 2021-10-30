#!/usr/bin/env bash

set -e

APP_DIR="$PWD/`dirname $0`/app"

platform="${1:-ios}"

# Manually delete any app previously created
if [ ! -d "$APP_DIR" ]; then
  echo "Couldn't locate an app directory, did you run install.sh?"
  exit 1
fi

cd $APP_DIR
# Run the app
npx react-native run-$platform
# Start listening for the app
node ../listen.js
