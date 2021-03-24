#!/bin/bash

CONFIGURATION=${1:-Release}
SRCROOT=$(cd "$(dirname "$0")/.." && pwd)
IOS_SIM_DEVICE=${IOS_SIM_DEVICE:-} # use preferentially, otherwise will be set and re-exported
SIM_DEVICE_NAME=realm-js-test
PACKAGER_OUT="$SRCROOT/packager_out.txt"
LOGCAT_OUT="$SRCROOT/logcat_out.txt"
RUN_STITCH_IN_FORGROUND=""
PATH="/opt/android-sdk-linux/platform-tools:$PATH"
XCPRETTY=$(which xcpretty || true)

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

start_server() {
  echo "test.sh: starting stitch"
  if [ "$CI_RUN" == "true" ]; then
    echo "CI Run detected, not manually starting a server"
    return;
  fi

  if [[ -z "$(command -v docker)" ]]; then
    echo "starting stitch requires docker"
    exit 1
  fi
  local EXISTING_STITCH=$(docker ps | grep "mongodb-realm-test-server.*9090")
  if [[ -n "$EXISTING_STITCH" ]]; then
    echo "found existing stitch running, not attempting to start another"
  else
    echo "no existing stitch instance running in docker, attempting to start one"
    . "${SRCROOT}/dependencies.list"
    local stitch_apps_path="tests/mongodb"
    DOCKER_VOLUMES=""
    for app in $(ls -d $stitch_apps_path/*/ | cut -f3 -d'/'); do
      local app_path="$stitch_apps_path/$app"
      if [[ -f "$app_path/config.json" ]]; then
        echo "Mounting folder '$app_path' as Stitch app."
        DOCKER_VOLUMES="$DOCKER_VOLUMES -v ${SRCROOT}/${app_path}:/apps/${app}"
      fi
    done
    echo "DOCKER_VOLUMES: $DOCKER_VOLUMES"
    echo "using object-store stitch dependency: ${MDBREALM_TEST_SERVER_TAG}"
    if [[ -n "$RUN_STITCH_IN_FORGROUND" ]]; then
      # we don't worry about tracking the STITCH_DOCKER_ID because without the -d flag, this docker is tied to the shell
      docker run $DOCKER_VOLUMES -p 9090:9090 -it "docker.pkg.github.com/realm/ci/mongodb-realm-test-server:${MDBREALM_TEST_SERVER_TAG}"
    else
      STITCH_DOCKER_ID=$(docker run -d $BACKGROUND_FLAG $DOCKER_VOLUMES -p 9090:9090 -it "docker.pkg.github.com/realm/ci/mongodb-realm-test-server:${MDBREALM_TEST_SERVER_TAG}")
      echo "starting docker image $STITCH_DOCKER_ID"
      # wait for stitch to import apps and start serving before continuing
      docker logs --follow "$STITCH_DOCKER_ID" | grep -m 1 "Serving on.*9090" || true
      echo "Started stitch with docker id: ${STITCH_DOCKER_ID}"
    fi
  fi
}

stop_server() {
  echo stopping server
  if [[ -n "$STITCH_DOCKER_ID" ]] ; then
    echo "stopping the docker instance that we started earlier: ${STITCH_DOCKER_ID}"
    docker stop "$STITCH_DOCKER_ID"
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

check_test_results() {
  echo "Checking tests results"
  if grep -q "REALM_FAILING_TESTS" $(pwd)/build/out.txt; then
      echo "*** REALM JS TESTS FAILED. See tests results above ***"
      exit 20
  else
      echo "*** $1 SUCCESS ***"
  fi
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

npm ci --ignore-scripts
npm run check-environment

echo "building iOS binaries"
#./scripts/build-ios.sh -s -c $CONFIGURATION

# set_nvm_default
# start_server

pushd tests/react-test-app
npm ci --no-optional
./node_modules/.bin/install-local
# open_chrome
# start_packager

pushd ios
pod install
xctest ReactTests
# stop_server

