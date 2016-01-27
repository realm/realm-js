#!/bin/bash

set -o pipefail
set -e

TARGET="$1"
CONFIGURATION="${2:-"Debug"}"
DESTINATION=
PATH="/opt/android-sdk-linux/platform-tools:$PATH"
SRCROOT=$(cd "$(dirname "$0")/.." && pwd)

# Start current working directory at the root of the project.
cd "$SRCROOT"

if [[ $TARGET != *-android ]]; then
  while pgrep -q Simulator; do
    # Kill all the current simulator processes as they may be from a
    # different Xcode version
    pkill Simulator 2>/dev/null || true
    # CoreSimulatorService doesn't exit when sent SIGTERM
    pkill -9 Simulator 2>/dev/null || true
  done
  DESTINATION="-destination id=$(xcrun simctl list devices | grep -v unavailable | grep -m 1 -o '[0-9A-F\-]\{36\}')"
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
  # Starting with --nonPersistent will avoid starting a file watcher.
  ./node_modules/react-native/packager/packager.sh --nonPersistent | tee "$PACKAGER_OUT" &

  while :; do
    if grep -Fxq "React packager ready." "$PACKAGER_OUT"; then
      break
    else
      echo "Waiting for packager."
      sleep 2
    fi
  done
}

unlock_device() {
  adb shell input keyevent 82
}

# Cleanup now and also cleanup when this script exits.
cleanup
trap cleanup EXIT

case "$TARGET" in
"realmjs")
  xcodebuild -scheme RealmJS -configuration "$CONFIGURATION" -sdk iphonesimulator $DESTINATION build test
  ;;
"react-tests")
  pushd tests/react-test-app

  if [ -f ../../target=node_modules/react_tests_node_modules.zip ]; then
      unzip -q ../../target=node_modules/react_tests_node_modules.zip
  fi

  npm update react-native
  open_chrome
  start_packager
  popd

  xcodebuild -scheme RealmReact -configuration "$CONFIGURATION" -sdk iphonesimulator $DESTINATION build test
  ;;
"react-example")
  pushd examples/ReactExample

  if [ -f ../../target=node_modules/react_example_node_modules.zip ]; then
    unzip -q ../../target=node_modules/react_example_node_modules.zip
  fi

  npm update react-native
  start_packager

  pushd ios
  xcodebuild -scheme ReactExample -configuration "$CONFIGURATION" -sdk iphonesimulator build $DESTINATION
  ;;
"react-tests-android")
  [ -s "${HOME}/.nvm/nvm.sh" ] && . "${HOME}/.nvm/nvm.sh"
  nvm use 5.4.0

  pushd react-native/android
  ./gradlew installarchives
  popd

  pushd tests/react-test-app

  npm install
  open_chrome
  start_packager
  unlock_device
  ./run-android.sh

  adb logcat -c
  adb logcat | tee "$LOGCAT_OUT" &

  while :; do
    if grep -q "__REALM_REACT_ANDROID_TESTS_COMPLETED__" "$LOGCAT_OUT"; then
      break
    else
      echo "Waiting for tests."
      sleep 2
    fi
  done

  adb pull /sdcard/tests.xml . || true

  echo "********* TESTS COMPLETED *********";
  echo "********* File location: $(pwd)/tests.xml *********";
  more tests.xml
  ;;
*)
  echo "Invalid target '${TARGET}'"
  exit 1
esac
