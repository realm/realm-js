#!/bin/bash

set -o pipefail
set -e

export TEST_SCRIPT=1
export NPM_CONFIG_PROGRESS=false

TARGET=$1
CONFIGURATION=${2:-Release}
NODE_VERSION=${3:-v10.18.1}

if echo "$CONFIGURATION" | grep -i "^Debug$" > /dev/null ; then
  CONFIGURATION="Debug"
fi

USE_REALM_DEBUG=0
if [ "${CONFIGURATION}" == "Debug" ]; then
      USE_REALM_DEBUG=1
fi

IOS_SIM_DEVICE=${IOS_SIM_DEVICE:-} # use preferentially, otherwise will be set and re-exported

PATH="/opt/android-sdk-linux/platform-tools:$PATH"
SRCROOT=$(cd "$(dirname "$0")/.." && pwd)
XCPRETTY=$(which xcpretty || true)
CI_RUN=false
if [ -n "${JENKINS_HOME}" ]; then
  CI_RUN=true
fi

SIM_DEVICE_NAME=realm-js-test

# Start current working directory at the root of the project.
cd "$SRCROOT"

# Add node_modules to PATH just in case we weren't called from `npm test`
PATH="$PWD/node_modules/.bin:$PATH"

if [[ $TARGET = *-android ]]; then
  # Inform the prepublish script to build Android modules.
  export REALM_BUILD_ANDROID=1
fi

SERVER_PID=0
PACKAGER_OUT="$SRCROOT/packager_out.txt"
LOGCAT_OUT="$SRCROOT/logcat_out.txt"

die() {
  echo "$@" >&2
  exit 1
}

start_server() {
  echo "test.sh: starting ROS"
  if [ -z "${SYNC_WORKER_FEATURE_TOKEN}" ]; then
     die "SYNC_WORKER_FEATURE_TOKEN must be set to run tests."
  fi

  ./scripts/download-object-server.sh
  mkdir -p "$(pwd)/build"
  local ros_log_temp=$(mktemp)
  node ./scripts/test-ros-server.js | tee $ros_log_temp &
  ( tail -f $ros_log_temp & ) | grep -q 'Started: '

  SERVER_PID=$(jobs -l | grep 'test-ros-server' | awk '{split($0, a, / */); print a[2]}')
  export ROS_DATA_DIR="$(perl -ne 'print "$1\n" if /^Started: (.*?)$/' $ros_log_temp)"
  echo ROS PID: ${SERVER_PID}
}

stop_server() {
  echo stopping server
  if [[ ${SERVER_PID} -gt 0 ]] ; then
    echo server is running. killing it
    kill -9 ${SERVER_PID} >/dev/null 2>&1  || true
    wait ${SERVER_PID} >/dev/null 2>&1 || true # wait may fail if the server exits fast enough
  fi
}

startedSimulator=false
log_temp=
test_temp_dir=
nvm_old_default=
cleanup() {
  # Kill started object server
  stop_server || true

  if [ "$(uname)" = 'Darwin' ]; then
    echo "shutting down running simulators"
    shutdown_ios_simulator >/dev/null 2>&1

    # Quit Simulator.app to give it a chance to go down gracefully
    if $startedSimulator; then
      osascript -e 'tell app "Simulator" to quit without saving' || true
      sleep 0.25 # otherwise the pkill following will get it too early
    fi
  fi

  if [[ "$(command -v pkill)" ]]; then
    # Kill all child processes.
    pkill -9 -P $$ || true

    # Kill react native packager
    pkill -x node || true
    rm -f "$PACKAGER_OUT" "$LOGCAT_OUT"
  fi

  # Cleanup temp files
  if [ -n "$log_temp" ] && [ -e "$log_temp" ]; then
    rm "$log_temp" || true
  fi
  if [ -n "$test_temp_dir" ] && [ -e "$test_temp_dir" ]; then
    rm -rf "$test_temp_dir" || true
  fi

  # Restore nvm state
  if [ -n "$nvm_old_default" ]; then
    echo Restoring nvm default to $nvm_old_default
    nvm alias default $nvm_old_default
    echo nvm default restored successfully
  fi
}

open_chrome() {
  if [ $CONFIGURATION == 'Release' ]; then
    return;
  fi

  local dir
  for dir in "$HOME/Applications" "/Applications"; do
    if [ -d "$dir/Google Chrome.app" ]; then
      open "$dir/Google Chrome.app"
      break
    fi
  done
}

start_packager() {
  rm -r $TMPDIR/react-* || true
  watchman watch-del-all || true
  ./node_modules/react-native/scripts/packager.sh --reset-cache | tee "$PACKAGER_OUT" &

  while :; do
    if grep -Fxq "Loading dependency graph, done." "$PACKAGER_OUT"; then
      break
    else
      echo "Waiting for packager."
      sleep 2
    fi
  done
}

xctest() {
  setup_ios_simulator

  # - Run the build and test
  echo "Building application"
  xcrun xcodebuild -workspace "$1.xcworkspace" -scheme "$1" -configuration "$CONFIGURATION" -sdk iphonesimulator -destination id="${IOS_SIM_DEVICE_ID}" -derivedDataPath ./build build-for-testing || {
      EXITCODE=$?
      echo "*** Failure (exit code $EXITCODE). ***"
      exit $EXITCODE
  }

  log_temp="$(pwd)/build/out.txt"
  echo "Launching tests. (output is in ${log_temp})"
  xcrun xcodebuild -workspace "$1.xcworkspace" -scheme "$1" -configuration "$CONFIGURATION" -sdk iphonesimulator -destination id="${IOS_SIM_DEVICE_ID}" -derivedDataPath ./build test-without-building 2>&1 | tee "$log_temp" || {
      EXITCODE=$?
      echo "*** Failure (exit code $EXITCODE). ***"
      exit $EXITCODE
  }

  echo "Shuttting down ${SIM_DEVICE_NAME} simulator. (device is not deleted. you can use it to debug the app)"
  shutdown_ios_simulator

  check_test_results $1
}

check_test_results() {
  echo "Checking tests results"
  if grep -q "REALM_FAILING_TESTS" $(pwd)/build/out.txt; then
      echo "*** REALM JS TESTS FAILED. See tests results above ***"
      exit 20
  else
      echo "*** $1 SUCCESS ***"
  fi
}

setup_ios_simulator() {
  #try deleting old simulator with same name.
  echo "Preparing to create a new simulator"
  delete_ios_simulator >/dev/null 2>&1

  #parse devices
  IOS_RUNTIME=$(xcrun simctl list runtimes | grep -v unavailable | grep -m1 -o 'com.apple.CoreSimulator.SimRuntime.iOS.*' | sed 's/[()]//g')
  echo using iOS Runtime ${IOS_RUNTIME} to create new simulator ${SIM_DEVICE_NAME}

  #create new test simulator
  IOS_SIM_DEVICE_ID=$(xcrun simctl create ${SIM_DEVICE_NAME} com.apple.CoreSimulator.SimDeviceType.iPhone-SE ${IOS_RUNTIME})
  #boot new test simulator
  xcrun simctl boot ${SIM_DEVICE_NAME}

  printf "Waiting for springboard to ensure device is ready..."
  xcrun simctl launch ${SIM_DEVICE_NAME} com.apple.springboard 1>/dev/null 2>/dev/null || true
  echo "  done"
}

shutdown_ios_simulator() {
  #shutdown test simulator
  xcrun simctl shutdown ${SIM_DEVICE_NAME} || true
}

delete_ios_simulator() {
  shutdown_ios_simulator

  #delete test simulator
  xcrun simctl delete ${SIM_DEVICE_NAME} || true
}

# Cleanup now and also cleanup when this script exits.
cleanup >/dev/null 2>&1
trap cleanup EXIT

echo Checking for nvm installation
# Use a consistent version of Node if possible.
if [[ -z "$(command -v nvm)" ]]; then
  set +e
  if [ -f "$NVM_DIR/nvm.sh" ]; then
    . "$NVM_DIR/nvm.sh" '' || true
  elif [ -x "$(command -v brew)" ] && [ -f "$(brew --prefix nvm)/nvm.sh" ]; then
    # we must be on mac and nvm was installed with brew
    # TODO: change the mac slaves to use manual nvm installation
    . "$(brew --prefix nvm)/nvm.sh" '' || true
  elif [ -f "$HOME/.nvm/nvm.sh" ]; then
    . ~/.nvm/nvm.sh ''
  fi
  set -e
fi
if [[ "$(command -v nvm)" ]]; then
  echo nvm installing $NODE_VERSION
  set +e
  nvm install $NODE_VERSION
  retVal=$?
  if [ $retVal -ne 0 ]; then
      echo "Error while installing $NODE_VERSION $retVal"
      exit $retVal
  fi
  set -e
  echo nvm install of $NODE_VERSION completed
fi
set_nvm_default() {
  if [ -n "$REALM_SET_NVM_ALIAS" ] && [[ "$(command -v nvm)" ]]; then
    echo REALM_SET_NVM_ALIAS is set.
    nvm_old_default="$(nvm alias default --no-colors | cut -d ' ' -f 3)"
    echo Setting nvm default alias to $(nvm current)
    nvm alias default $(nvm current)
  fi
}

# Remove cached packages
rm -rf ~/.yarn-cache/npm-realm-*

case "$TARGET" in
"check-environment")
  npm run check-environment
  ;;
"eslint")
  [[ $CONFIGURATION == 'Debug' ]] && exit 0
  npm run eslint
  ;;
"eslint-ci")
  [[ $CONFIGURATION == 'Debug' ]] && exit 0
  npm ci
  ./node_modules/.bin/eslint -f checkstyle . > eslint.xml || true
  ;;
"license-check")
  [[ $CONFIGURATION == 'Debug' ]] && exit 0
  npm run license-check
  ;;
"jsdoc")
  [[ $CONFIGURATION == 'Debug' ]] && exit 0
  npm run jsdoc
  ;;
"react-tests")
  npm run check-environment
  set_nvm_default
  npm ci
  start_server

  pushd tests/react-test-app
  npm ci
  ./node_modules/.bin/install-local
  open_chrome
  start_packager

  pushd ios
  pod install
  xctest ReactTests
  stop_server
  ;;
"react-example")
  npm run check-environment
  set_nvm_default
  npm ci

  pushd examples/ReactExample
  npm ci
  ./node_modules/.bin/install-local
  open_chrome
  start_packager

  pushd ios
  pod install
  xctest ReactExample
  popd
  ;;
"react-tests-android")
  npm run check-environment
  start_server

  [[ $CONFIGURATION == 'Debug' ]] && exit 0
  XCPRETTY=''

  pushd react-native/android
  $(pwd)/gradlew publishAndroid
  popd

  pushd tests/react-test-app
  npm ci
  ./node_modules/.bin/install-local

  echo "Resetting logcat"
  # Despite the docs claiming -c to work, it doesn't, so `-T 1` alleviates that.
  mkdir -p $(pwd)/build || true
  adb logcat -c
  adb logcat -T 1 | tee "$LOGCAT_OUT" | tee $(pwd)/build/out.txt &

  ./run-android.sh

  echo "Start listening for Test completion"

  while :; do
    if grep -q "__REALM_JS_TESTS_COMPLETED__" "$LOGCAT_OUT"; then
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

  check_test_results ReactTests
  ;;

"node")
  npm run check-environment
  npm ci --build-from-source=realm --realm_enable_sync --use_realm_debug=${USE_REALM_DEBUG}
  start_server

  # Change to a temp directory.
  cd "$(mktemp -q -d -t realm.node.XXXXXX)"
  test_temp_dir=$PWD # set it to be cleaned at exit

  pushd "$SRCROOT/tests"
  npm ci
  npm run test
  popd
  stop_server
  ;;
"electron")
  npm ci
  start_server

  pushd "$SRCROOT/tests/electron"
  # Build Realm and runtime deps for electron
  export npm_config_build_from_source=realm
  export npm_config_target=5.0.13
  export npm_config_runtime=electron
  export npm_config_disturl=https://atom.io/download/electron
  npm ci --realm_enable_sync
  ./node_modules/.bin/install-local

  npm test -- --process=main

  popd
  stop_server
  start_server
  pushd "$SRCROOT/tests/electron"

  npm test -- --process=render

  popd

  stop_server
  ;;
"test-runners")
  npm run check-environment
  npm ci --build-from-source=realm --use_realm_debug=${USE_REALM_DEBUG}
  npm run test-runners
  ;;
"all")
  # Run all tests that must pass before publishing.
  for test in eslint license-check react-example react-tests-android react-tests; do
    for configuration in Debug Release; do
      echo "RUNNING TEST: $test ($configuration)"
      echo '----------------------------------------'
      npm test "$test" "$configuration" || die "Test Failed: $test ($configuration)"
      echo
    done
  done
  ;;
"object-store")
  pushd src/object-store
  cmake -DCMAKE_BUILD_TYPE="$CONFIGURATION" .
  make run-tests
  ;;
*)
  echo "Invalid target '${TARGET}'"
  exit 1
esac
