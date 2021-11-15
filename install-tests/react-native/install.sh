#!/usr/bin/env bash

set -e

react_native_version="${1:-next}"
realm_version="${2:-latest}"

echo "Using React Native version = $react_native_version"
echo "Using Realm version = $realm_version"

APP_DIR="$PWD/`dirname $0`/app"

# Manually delete any previously created app
if [ -d "$APP_DIR" ]; then
  echo "Found an existing app directory: Skipping React Native init"
else
  # Create a new React Native app using the desired version
  npx --yes react-native@$react_native_version init ReactNativeTestApp --version $react_native_version --directory $APP_DIR --npm
fi

cd $APP_DIR
# Install CLI tools and Realm (using --force to ignore potential peerDependencies failures)
npm install concurrently retry-cli pod-install realm@$realm_version --force
# Run pod-install again
npx pod-install
# Overwrite the App.js
cp ../App.js .
