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
XCPRETTY=true

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
  sh ./scripts/download-object-server.sh
}

start_server() {
  sh ./object-server-for-testing/start-object-server.command &
  SERVER_PID=$!
}

stop_server() {
  if [[ ${SERVER_PID} > 0 ]] ; then
    kill ${SERVER_PID}
  fi
}

cleanup() {
  # Kill started object server
  stop_server

  # Kill all other child processes.
  pkill -P $$ || true

  # Kill react native packager
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
  local dest="$(xcrun simctl list devices | grep -v unavailable | grep -m 1 -o '[0-9A-F\-]\{36\}')"
  if [ -n "$XCPRETTY" ]; then
    mkdir -p build
    xcodebuild -scheme "$1" -configuration "$CONFIGURATION" -sdk iphonesimulator -destination id="$dest" build test | tee build/build.log | xcpretty -c --no-utf --report junit --output build/reports/junit.xml || {
        echo "The raw xcodebuild output is available in build/build.log"
        exit 1
    }
  else
    xcodebuild -scheme "$1" -configuration "$CONFIGURATION" -sdk iphonesimulator -destination id="$dest" build test
  fi
}

# Cleanup now and also cleanup when this script exits.
cleanup
trap cleanup EXIT

# Use a consistent version of Node if possible.
if [ -s "${HOME}/.nvm/nvm.sh" ]; then
  . "${HOME}/.nvm/nvm.sh"
  nvm use 4.4.7 || true
fi

# Remove cached packages
rm -rf ~/.yarn-cache/npm-realm-*

case "$TARGET" in
"eslint")
  [[ $CONFIGURATION == 'Debug' ]] && exit 0
  npm install
  npm run lint .
  ;;
"eslint-ci")
  [[ $CONFIGURATION == 'Debug' ]] && exit 0
  npm install
  ./node_modules/.bin/eslint -f checkstyle . > eslint.xml || true
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
  if ! [ -z "${JENKINS_HOME}" ]; then
    ${SRCROOT}/scripts/reset-simulators.sh
  fi

  pushd tests/react-test-app

  npm install
  open_chrome
  start_packager

  pushd ios
  xctest ReactTestApp || xctest ReactTestApp
  ;;
"react-example")
  if ! [ -z "${JENKINS_HOME}" ]; then
    ${SRCROOT}/scripts/reset-simulators.sh
  fi

  pushd examples/ReactExample

  npm install
  open_chrome
  start_packager

  pushd ios
  xctest ReactExample || xctest ReactExample
  ;;
"react-tests-android")
  [[ $CONFIGURATION == 'Debug' ]] && exit 0
  XCPRETTY=false

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
  if [ "$(uname)" = 'Darwin' ]; then
    download_server
    start_server
    npm_tests_cmd="npm run test"
    npm install --build-from-source --realm_enable_sync
  else
    npm_tests_cmd="npm run test-nosync"
    npm install --build-from-source
  fi

  # Change to a temp directory.
  cd "$(mktemp -q -d -t realm.node.XXXXXX)"
  trap "rm -rf '$PWD'" EXIT

  pushd "$SRCROOT/tests"
  npm install
  eval $npm_tests_cmd
  popd
  stop_server
  ;;
"node-nosync")
  npm install --build-from-source

  # Change to a temp directory.
  cd "$(mktemp -q -d -t realm.node.XXXXXX)"
  trap "rm -rf '$PWD'" EXIT

  pushd "$SRCROOT/tests"
  npm install
  npm run test-nosync
  popd
  ;;
"test-runners")
  npm install --build-from-source

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
"download-object-server")
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
"object-server-integration")
  echo -e "yes\n" | ./tests/sync-bundle/reset-server-realms.command

  pushd "$SRCROOT/tests"
  npm install
  npm run test-sync-integration
  popd
  ;;
*)
  echo "Invalid target '${TARGET}'"
  exit 1
esac
