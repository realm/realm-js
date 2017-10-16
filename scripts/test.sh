#!/bin/bash

set -o pipefail
set -e

export TEST_SCRIPT=1
export NPM_CONFIG_PROGRESS=false

TARGET=$1
CONFIGURATION=${2:-Release}

if echo "$CONFIGURATION" | grep -i "^Debug$" > /dev/null ; then
  CONFIGURATION="Debug"
fi

IOS_SIM_DEVICE=${IOS_SIM_DEVICE:-} # use preferentially, otherwise will be set and re-exported

PATH="/opt/android-sdk-linux/platform-tools:$PATH"
SRCROOT=$(cd "$(dirname "$0")/.." && pwd)
XCPRETTY=$(which xcpretty || true)
CI_RUN=false
if [ -n "${JENKINS_HOME}" ]; then
  CI_RUN=true
fi

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


download_server() {
  echo "test.sh: downloading ROS"
  ./scripts/download-object-server.sh
}

start_server() {
  echo "test.sh: starting ROS"
  #disabled ROS logging
  # sh ./object-server-for-testing/start-object-server.command &> /dev/null &

  #enabled ROS logging
  #sh ./object-server-for-testing/start-object-server.command &
  export ROS_SKIP_PROMTS=true &&  ./node_modules/.bin/ros start --data realm-object-server-data &
  SERVER_PID=$!
  echo ROS PID: ${SERVER_PID}
}

stop_server() {
  echo stopping server
  if [[ ${SERVER_PID} -gt 0 ]] ; then
    echo server is running. killing it
    kill -9 ${SERVER_PID} || true
  fi
}

startedSimulator=false
log_temp=
test_temp_dir=
cleanup() {
  # Kill started object server
  stop_server || true

  # Quit Simulator.app to give it a chance to go down gracefully
  if $startedSimulator; then
    osascript -e 'tell app "Simulator" to quit without saving' || true
    sleep 0.25 # otherwise the pkill following will get it too early
  fi

  # Kill all child processes.
  pkill -9 -P $$ || true

  # Kill react native packager
  pkill -x node || true
  rm -f "$PACKAGER_OUT" "$LOGCAT_OUT"

  # Cleanup temp files
  if [ -n "$log_temp" ] && [ -e "$log_temp" ]; then
    rm "$log_temp" || true
  fi
  if [ -n "$test_temp_dir" ] && [ -e "$test_temp_dir" ]; then
    rm -rf "$test_temp_dir" || true
  fi
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
  setup_ios_simulator

  # - Wait until the simulator is fully booted by waiting for it to launch SpringBoard
  printf "Waiting for springboard to ensure device is ready..."
  xcrun simctl launch "$IOS_SIM_DEVICE" com.apple.springboard 1>/dev/null 2>/dev/null || true
  echo "  done"

  # - Run the build and test
  xcrun xcodebuild -scheme "$1" -configuration "$CONFIGURATION" -sdk iphonesimulator -destination id="$IOS_SIM_DEVICE" build || {
      EXITCODE=$?
      echo "*** Failure (exit code $EXITCODE). ***"
      exit $EXITCODE
  }
  if [ -n "$XCPRETTY" ]; then
    log_temp=$(mktemp build.log.XXXXXX)
    if [ -e "$log_temp" ]; then
      rm "$log_temp"
    fi
    xcrun xcodebuild -scheme "$1" -configuration "$CONFIGURATION" -sdk iphonesimulator -destination name="iPhone 5s" test 2>&1 | tee "$log_temp" | "$XCPRETTY" -c --no-utf --report junit --output build/reports/junit.xml || {
        EXITCODE=$?
        printf "*** Xcode Failure (exit code %s). The full xcode log follows: ***\n\n" "$EXITCODE"
        cat "$log_temp"
        printf "\n\n*** End Xcode Failure ***\n"
        exit $EXITCODE
    }
    rm "$log_temp"
  else
    xcrun xcodebuild -scheme "$1" -configuration "$CONFIGURATION" -sdk iphonesimulator -destination id="$IOS_SIM_DEVICE" test || {
        EXITCODE=$?
        echo "*** Failure (exit code $EXITCODE). ***"
        exit $EXITCODE
    }
  fi
}

setup_ios_simulator() {
  # - Ensure one version of xcode is chosen by all tools
  if [[ -z "$DEVELOPER_DIR" ]]; then
    DEV_DIR="$(xcode-select -p)"
    export DEVELOPER_DIR=$DEV_DIR
  fi

  # -- Ensure that the simulator is ready

  if [ $CI_RUN == true ]; then
    # - Kill the Simulator to ensure we are running the correct one, only when running in CI
    echo "Resetting simulator using toolchain from: $DEVELOPER_DIR"

    # Quit Simulator.app to give it a chance to go down gracefully
    local deadline=$((SECONDS+5))
    while pgrep -qx Simulator && [ $SECONDS -lt $deadline ]; do
      osascript -e 'tell app "Simulator" to quit without saving' || true
      sleep 0.25 # otherwise the pkill following will get it too early
    done

    # stop CoreSimulatorService
    launchctl remove com.apple.CoreSimulator.CoreSimulatorService 2>/dev/null || true
    sleep 0.25 # launchtl can take a small moment to kill services

    # kill them with fire
    while pgrep -qx Simulator com.apple.CoreSimulator.CoreSimulatorService; do
      pkill -9 -x Simulator com.apple.CoreSimulator.CoreSimulatorService || true
      sleep 0.05
    done

    # - Prod `simctl` a few times as sometimes it fails the first couple of times after switching XCode vesions
    local deadline=$((SECONDS+5))
    while [ -z "$(xcrun simctl list devices 2>/dev/null)" ] && [ $SECONDS -lt $deadline ]; do
      : # nothing to see here, will stop cycling on the first successful run
    done

    # - Choose a device, if it has not already been chosen
    local deadline=$((SECONDS+5))
    IOS_DEVICE=""
    while [ -z "$IOS_DEVICE" ] && [ $SECONDS -lt $deadline ]; do
        IOS_DEVICE="$(ruby $SRCROOT/scripts/find-ios-device.rb best)"
    done
    if [ -z "$IOS_DEVICE" ]; then
      echo "*** Failed to determine the iOS Simulator device to use ***"
      exit 1
    fi
    export IOS_SIM_DEVICE=$IOS_DEVICE

    # - Reset the device we will be using if running in CI
    xcrun simctl shutdown "$IOS_SIM_DEVICE" 1>/dev/null 2>/dev/null || true # sometimes simctl gets confused
    xcrun simctl erase "$IOS_SIM_DEVICE"

    # - Start the target in Simulator.app
    # Note: as of Xcode 7.3.1 `simctl` can not completely boot a simulator, specifically it can not bring up backboard, so GUI apps can not run.
    #       This is fixed in version 8 of Xcode, but we still need the compatibility

    "$DEVELOPER_DIR/Applications/Simulator.app/Contents/MacOS/Simulator" -CurrentDeviceUDID "$IOS_SIM_DEVICE" & # will get killed with all other children at exit
    startedSimulator=true

  else
      # - ensure that the simulator is running on a developer's workstation
    open "$DEVELOPER_DIR/Applications/Simulator.app"

    # - Select the first device booted in the simulator, since it will boot something for us
    local deadline=$((SECONDS+10))
    IOS_DEVICE=""
    while [ -z "$IOS_DEVICE" ] && [ $SECONDS -lt $deadline ]; do
      IOS_DEVICE="$(ruby $SRCROOT/scripts/find-ios-device.rb booted)"
    done
    if [ -z "$IOS_DEVICE" ]; then
      echo "*** Failed to determine the iOS Simulator device in use ***"
      exit 1
    fi
    export IOS_SIM_DEVICE=$IOS_DEVICE
  fi

  # Wait until the boot completes
  printf "  waiting for simulator (%s) to boot..." "$IOS_SIM_DEVICE"
  until ruby -rjson -e "exit JSON.parse(%x{xcrun simctl list devices --json})['devices'].flat_map { |d| d[1] }.any? { |d| d['availability'] == '(available)' && d['state'] == 'Booted' }"; do
    sleep 0.25
  done
  echo " done"
  echo "It will take some time before the simulator is fully ready, continuing on to other work"
}

# Cleanup now and also cleanup when this script exits.
cleanup
trap cleanup EXIT

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
  nvm install 7.10.0
fi

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
  npm install
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
  download_server
  start_server
  pushd tests/react-test-app
  npm install
  open_chrome
  start_packager

  pushd ios
  xctest ReactTestApp
  stop_server
  ;;
"react-example")
  npm run check-environment
  pushd examples/ReactExample

  npm install
  open_chrome
  start_packager

  pushd ios
  xctest ReactExample
  ;;
"react-tests-android")
  npm run check-environment
  if [ "$(uname)" = 'Darwin' ]; then
    download_server
    start_server
  fi

  [[ $CONFIGURATION == 'Debug' ]] && exit 0
  XCPRETTY=''

  pushd tests/react-test-app

  npm install

  echo "Resetting logcat"
  # Despite the docs claiming -c to work, it doesn't, so `-T 1` alleviates that.
  adb logcat -c
  adb logcat -T 1 | tee "$LOGCAT_OUT" &

  ./run-android.sh

  echo "Start listening for Test completion"

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
  npm run check-environment
  if [ "$(uname)" = 'Darwin' ]; then
    echo "downloading server"
    download_server
    echo "starting server"
    start_server

    npm_tests_cmd="npm run test"
    npm install --build-from-source=realm --realm_enable_sync

  else
    npm_tests_cmd="npm run test"
    npm install --build-from-source=realm
  fi

  # Change to a temp directory.
  cd "$(mktemp -q -d -t realm.node.XXXXXX)"
  test_temp_dir=$PWD # set it to be cleaned at exit

  pushd "$SRCROOT/tests"
  npm install
  eval "$npm_tests_cmd"
  popd
  stop_server
  ;;
"electron")
  if [ "$(uname)" = 'Darwin' ]; then
    download_server
    start_server
  fi

  # Change to a temp directory - because this is what is done for node - but we pushd right after?
  cd "$(mktemp -q -d -t realm.electron.XXXXXX)"
  test_temp_dir=$PWD # set it to be cleaned at exit
  pushd "$SRCROOT/tests/electron"

  if [ "$(uname)" = 'Darwin' ]; then
    npm install --build-from-source --realm_enable_sync
  else
    npm install --build-from-source
  fi

  # npm test -- --filter=ListTests
  # npm test -- --filter=LinkingObjectsTests
  # npm test -- --filter=ObjectTests
  # npm test -- --filter=RealmTests
  # npm test -- --filter=ResultsTests
  # npm test -- --filter=QueryTests
  # npm test -- --filter=MigrationTests
  # npm test -- --filter=EncryptionTests
  # npm test -- --filter=UserTests
  # npm test -- --filter=SessionTests
  # npm test -- --filter=GarbageCollectionTests
  # npm test -- --filter=AsyncTests

  npm test -- --process=main
  npm test -- --process=render

  popd

  if [ "$(uname)" = 'Darwin' ]; then
    stop_server
  fi
  ;;
"test-runners")
  npm run check-environment
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
"download-object-server")
  # shellcheck disable=SC1091
  . dependencies.list

  object_server_bundle="realm-object-server-bundled_node_darwin-$REALM_OBJECT_SERVER_VERSION.tar.gz"
  curl -f -L "https://static.realm.io/downloads/object-server/$object_server_bundle" -o "$object_server_bundle"
  rm -rf tests/sync-bundle
  mkdir -p tests/sync-bundle
  tar -C tests/sync-bundle -xf "$object_server_bundle"
  rm "$object_server_bundle"

  echo -e "enterprise:\n  skip_setup: true\n" >> "tests/sync-bundle/object-server/configuration.yml"
  touch "tests/sync-bundle/object-server/do_not_open_browser"
  ;;
*)
  echo "Invalid target '${TARGET}'"
  exit 1
esac
