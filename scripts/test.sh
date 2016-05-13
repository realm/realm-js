#!/bin/bash

set -o pipefail
set -e

TARGET="$1"
CONFIGURATION="${2:-"Release"}"
DESTINATION=
PATH="/opt/android-sdk-linux/platform-tools:$PATH"
SRCROOT=$(cd "$(dirname "$0")/.." && pwd)

# Start current working directory at the root of the project.
cd "$SRCROOT"

# Add node_modules to PATH just in case we weren't called from `npm test`
PATH="$PWD/node_modules/.bin:$PATH"

if [[ $TARGET = *-android ]]; then
  # Inform the prepublish script to build Android modules.
  export REALM_BUILD_ANDROID=1
fi

PACKAGER_OUT="$SRCROOT/packager_out.txt"
LOGCAT_OUT="$SRCROOT/logcat_out.txt"

cleanup() {
  # Kill all child processes.
  pkill -P $$ || true
  pkill node || true
  rm -f "$PACKAGER_OUT" "$LOGCAT_OUT"
}

kill_ios_simulator() {
  while pgrep -q Simulator; do
    # Kill all the current simulator processes as they may be from a
    # different Xcode version
    pkill Simulator 2>/dev/null || true
    # CoreSimulatorService doesn't exit when sent SIGTERM
    pkill -9 Simulator 2>/dev/null || true
  done
}

open_chrome() {
  local dir
  for dir in "$HOME/Applications" "/Applications"; do
    if [ -d "$dir/Google Chrome.app" ]; then
      open "$dir/Google Chrome.app"
      break
    fi
  done
}

start_packager() {
  watchman watch-del-all || true
  ./node_modules/react-native/packager/packager.sh | tee "$PACKAGER_OUT" &

  while :; do
    if grep -Fxq "React packager ready." "$PACKAGER_OUT"; then
      break
    else
      echo "Waiting for packager."
      sleep 2
    fi
  done
}

xctest() {
  kill_ios_simulator

  local dest="$(xcrun simctl list devices | grep -v unavailable | grep -m 1 -o '[0-9A-F\-]\{36\}')"
  xcodebuild -scheme "$1" -configuration "$CONFIGURATION" -sdk iphonesimulator -destination id="$dest" build test
}

# Cleanup now and also cleanup when this script exits.
cleanup
trap cleanup EXIT

# Use a consistent version of Node if possible.
if [ -s "${HOME}/.nvm/nvm.sh" ]; then
  . "${HOME}/.nvm/nvm.sh"
  nvm use 5.4.0 || true
fi

case "$TARGET" in
"eslint")
  [[ $CONFIGURATION == 'Debug' ]] && exit 0
  npm install
  npm run lint .
  ;;
"jsdoc")
  [[ $CONFIGURATION == 'Debug' ]] && exit 0
  npm install
  npm run jsdoc
  ;;
"realmjs")
  pushd src/ios
  xctest RealmJS
  ;;
"react-tests")
  pushd tests/react-test-app

  if [ -f ../../target=node_modules/react_tests_node_modules.zip ]; then
      unzip -q ../../target=node_modules/react_tests_node_modules.zip
  fi

  npm install
  open_chrome
  start_packager

  pushd ios
  xctest ReactTestApp
  ;;
"react-example")
  pushd examples/ReactExample

  if [ -f ../../target=node_modules/react_example_node_modules.zip ]; then
    unzip -q ../../target=node_modules/react_example_node_modules.zip
  fi

  npm install
  open_chrome
  start_packager

  pushd ios
  xctest ReactExample
  ;;
"react-tests-android")
  [[ $CONFIGURATION == 'Debug' ]] && exit 0

  pushd tests/react-test-app

  npm install
  open_chrome
  start_packager
  ./run-android.sh

  # Despite the docs claiming -c to work, it doesn't, so `-T 1` alleviates that.
  adb logcat -c
  adb logcat -T 1 | tee "$LOGCAT_OUT" &

  while :; do
    if grep -q "__REALM_REACT_ANDROID_TESTS_COMPLETED__" "$LOGCAT_OUT"; then
      break
    else
      echo "Waiting for tests."
      sleep 2
    fi
  done

  rm -f tests.xml
  adb pull /sdcard/tests.xml .

  # Stop running child processes before printing results.
  cleanup
  echo "********* TESTS COMPLETED *********";
  echo "********* File location: $(pwd)/tests.xml *********";
  cat tests.xml
  ;;
"node")
  npm install
  scripts/download-core.sh

  pushd src/node
  node-gyp configure

  # Being explicit about debug mode rather than relying on defaults.
  if [[ $CONFIGURATION == 'Debug' ]]; then
    node-gyp build --debug
  else
    node-gyp build --no-debug
  fi

  popd

  # Link to the appropriate module in the build directory.
  mkdir -p build
  ln -fs "../src/node/build/$CONFIGURATION/realm.node" build

  # Change to a temp directory.
  cd "$(mktemp -q -d -t realm.node.XXXXXX)"
  trap "rm -rf '$PWD'" EXIT

  node "$SRCROOT/tests"
  ;;
"object-store")
  pushd src/object-store
  cmake -DCMAKE_BUILD_TYPE=$CONFIGURATION .
  make run-tests
  ;;
*)
  echo "Invalid target '${TARGET}'"
  exit 1
esac
