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
  export ROS_SKIP_PROMPTS=true &&  ./node_modules/.bin/ros start --data realm-object-server-data &
  SERVER_PID=$!
  echo ROS PID: ${SERVER_PID}
}

stop_server() {
  echo stopping server
  if [[ ${SERVER_PID} -gt 0 ]] ; then
    echo server is running. killing it
    kill -9 ${SERVER_PID} >/dev/null 2>&1  || true
  fi
}

startedSimulator=false
log_temp=
test_temp_dir=
cleanup() {
  # Kill started object server
  stop_server || true

  echo "shutting down running simulators"
  shutdown_ios_simulator >/dev/null 2>&1

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
  watchman watch-del-all || true
  ./node_modules/react-native/scripts/packager.sh | tee "$PACKAGER_OUT" &

  while :; do
    if grep -Fxq "Metro Bundler ready." "$PACKAGER_OUT"; then
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
  xcrun xcodebuild -scheme "$1" -configuration "$CONFIGURATION" -sdk iphonesimulator -destination id="${IOS_SIM_DEVICE_ID}" -derivedDataPath ./build build || {
      EXITCODE=$?
      echo "*** Failure (exit code $EXITCODE). ***"
      exit $EXITCODE
  }

  echo "Installing application on ${SIM_DEVICE_NAME}"
  echo "Application Path" $(pwd)/build/Build/Products/$CONFIGURATION-iphonesimulator/$1.app
  xcrun simctl install ${SIM_DEVICE_NAME} $(pwd)/build/Build/Products/$CONFIGURATION-iphonesimulator/$1.app


  echo "Launching application. (output is in $(pwd)/build/out.txt)"
  testpid=$(xcrun simctl launch --stdout=$(pwd)/build/out.txt --stderr=$(pwd)/build/err.txt ${SIM_DEVICE_NAME} io.realm.$1 | grep -m1 -o '\d\+$')
  tail -n +0 -f $(pwd)/build/out.txt &
  stdoutpid=$!
  tail -n +0 -f $(pwd)/build/err.txt &
  stderrpid=$!

  # `kill -0` checks if a signal can be sent to the pid without actually doing so
  while kill -0 $testpid 2> /dev/null; do sleep 1; done

  kill $stdoutpid
  kill $stderrpid

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
  npm install
  rootdir="$(pwd)"
  npm run check-environment
  download_server
  start_server
  pushd tests/react-test-app
  npm install
  rm -f package-lock.json
  "${rootdir}/node_modules/.bin/install-local ../.."
  (cd .. && npm install && rm -f package-lock.json) && "${rootdir}/node_modules/.bin/install-local .."
  open_chrome
  start_packager

  pushd ios
  xctest ReactTests
  stop_server
  ;;
"react-example")
  npm install
  rootdir="$(pwd)"
  npm run check-environment
  pushd examples/ReactExample

  "${rootdir}/node_modules/.bin/install-local"
  open_chrome
  start_packager

  echo "{ \"test\" : true }" > $(pwd)/components/params.json
  pushd ios
  xctest ReactExample
  popd
  echo "{}" > $(pwd)/components/params.json
  ;;
"react-tests-android")
  npm install
  rootdir="$(pwd)"
  npm run check-environment
  if [ "$(uname)" = 'Darwin' ]; then
    download_server
    start_server
  fi

  [[ $CONFIGURATION == 'Debug' ]] && exit 0
  XCPRETTY=''

  pushd react-native/android
  $(pwd)/gradlew publishAndroid
  popd

  pushd tests/react-test-app
  "${rootdir}/node_modules/.bin/install-local"

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
  rootdir="$(pwd)"
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
  "${rootdir}/node_modules/.bin/install-local"
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
