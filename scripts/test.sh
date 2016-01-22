#!/bin/bash

set -o pipefail
set -e

TARGET=$1
CONFIGURATION=${2:-"Debug"}

if [ "$TARGET" != "react-tests-android" ]; then
while pgrep -q Simulator; do
    # Kill all the current simulator processes as they may be from a
    # different Xcode version
    pkill Simulator 2>/dev/null || true
    # CoreSimulatorService doesn't exit when sent SIGTERM
    pkill -9 Simulator 2>/dev/null || true
  done
  DESTINATION="-destination id=$(xcrun simctl list devices | grep -v unavailable | grep -m 1 -o '[0-9A-F\-]\{36\}')"
fi

PACKAGER_OUT="packager_out.txt"
function start_packager()
{
  rm -f $PACKAGER_OUT
  sh ./node_modules/react-native/packager/packager.sh | tee $PACKAGER_OUT &
  while :;
  do
  if grep -Fxq "React packager ready." $PACKAGER_OUT
  then
    break
  else
    echo "Waiting for packager."
    sleep 2
  fi  
  done
}

# kill old packagers
pkill node || true

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

  xcodebuild -scheme ReactExample -configuration "$CONFIGURATION" -sdk iphonesimulator build $DESTINATION
  popd
elif [ "$TARGET" = "react-tests-android" ]; then
  pushd react-native/android
  ./gradlew installarchives
  popd

  pushd tests/react-test-app

  if [ -d  ~/Applications/Google\ Chrome.app ]; then
    open ~/Applications/Google\ Chrome.app
  fi

  npm install
  start_packager

  sh run-android.sh
 
  LOGCAT_OUT="logcat_out.txt"
  rm -f $LOGCAT_OUT

  adb logcat -c
  adb logcat | tee $LOGCAT_OUT &
  while :;
  do
  if grep -q "FILE WRITTEN!!" $LOGCAT_OUT
  then
    break
  else
    echo "Waiting for tests."
    sleep 2
  fi  
  done 

  adb pull /data/data/com.demo/files/tests.xml . || true
else
  echo "Invalid target '${TARGET}'"
fi

# kill all children
pkill -P $$
pkill node || true
rm -f $PACKAGER_OUT
rm -f $LOGCAT_OUT

