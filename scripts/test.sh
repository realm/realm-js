#!/bin/bash

set -o pipefail
set -e

export TEST_SCRIPT=1
export NPM_CONFIG_PROGRESS=false

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
  ${SRCROOT}/scripts/reset-simulators.sh 

  local dest="$(xcrun simctl list devices | grep -v unavailable | grep -m 1 -o '[0-9A-F\-]\{36\}')"
  if [ -n "$XCPRETTY" ]; then
    xcodebuild -scheme "$1" -configuration "$CONFIGURATION" -sdk iphonesimulator -destination id="$dest" test | xcpretty -c --no-utf --report junit --output build/reports/junit.xml
  else
    xcodebuild -scheme "$1" -configuration "$CONFIGURATION" -sdk iphonesimulator -destination id="$dest" test
  fi
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
  pushd src
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
  scripts/download-core.sh node
  src/node/build-node.sh $CONFIGURATION

  # Change to a temp directory.
  cd "$(mktemp -q -d -t realm.node.XXXXXX)"
  trap "rm -rf '$PWD'" EXIT

  node "$SRCROOT/tests"
  ;;
"test-runners")
  npm install
  scripts/download-core.sh node
  src/node/build-node.sh $CONFIGURATION

  for runner in ava mocha jest; do
    pushd "$SRCROOT/tests/test-runners/$runner"
    npm install
    npm test
    popd
  done
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
