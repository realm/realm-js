#!/bin/bash

set -o pipefail
set -e

while pgrep -q Simulator; do
    # Kill all the current simulator processes as they may be from a
    # different Xcode version
    pkill Simulator 2>/dev/null || true
    # CoreSimulatorService doesn't exit when sent SIGTERM
    pkill -9 Simulator 2>/dev/null || true
  done


DESTINATION="-destination id=$(xcrun simctl list devices | grep -v unavailable | grep -m 1 -o '[0-9A-F\-]\{36\}')"
TARGET=$1
CONFIGURATION=${2:-"Debug"}
PACKAGER_OUT="packager_out.txt"

function start_packager()
{
  rm -f $PACKAGER_OUT
  sh ./node_modules/react-native/packager/packager.sh | tee packager_out.txt &
  while :;
  do
  if grep -Fxq "React packager ready." packager_out.txt
  then
    break
  else
    echo "Waiting for packager."
    sleep 2
  fi  
  done
}

function kill_packager()
{
  rm -f $PACKAGER_OUT
  pkill node || true
}

kill_packager

if [ "$TARGET" = "realmjs" ]; then
  xcodebuild -scheme RealmJS -configuration "$CONFIGURATION" -sdk iphonesimulator $DESTINATION build test 
elif [ "$TARGET" = "react-tests" ]; then
  pushd tests/react-test-app

  if [ -d  ~/Applications/Google\ Chrome.app ]; then
    open ~/Applications/Google\ Chrome.app
  fi

  if [ -f ../../target=node_modules/react_tests_node_modules.zip ]; then
      unzip -q ../../target=node_modules/react_tests_node_modules.zip
  fi
  npm update react-native
  start_packager
  popd
  
  xcodebuild -scheme RealmReact -configuration "$CONFIGURATION" -sdk iphonesimulator $DESTINATION build test
elif [ "$TARGET" = "react-example" ]; then
  pushd examples/ReactExample
  if [ -f ../../target=node_modules/react_example_node_modules.zip ]; then
    unzip -q ../../target=node_modules/react_example_node_modules.zip
  fi
  npm update react-native
  start_packager

  cd ios
  xcodebuild -scheme ReactExample -configuration "$CONFIGURATION" -sdk iphonesimulator build $DESTINATION
  popd
else
  echo "Invalid target '${TARGET}'"
fi

kill_packager
