#!/bin/bash

set -o pipefail
set -e

export TEST_SCRIPT=1
export NPM_CONFIG_PROGRESS=false

TARGET=$1
CONFIGURATION=${2:-Release}
NODE_VERSION=${3:-v12.22.5}

if echo "$CONFIGURATION" | grep -i "^Debug$" > /dev/null ; then
  CONFIGURATION="Debug"
fi

USE_REALM_DEBUG=0
if [ "${CONFIGURATION}" == "Debug" ]; then
      USE_REALM_DEBUG=1
fi

USE_REALM_SYNC=1

SRCROOT=$(cd "$(dirname "$0")/.." && pwd)
CI_RUN=false
if [ -n "${JENKINS_HOME}" ]; then
  CI_RUN=true
fi

SIM_DEVICE_NAME=realm-js-test

# Start current working directory at the root of the project.
cd "$SRCROOT"

# Add node_modules to PATH just in case we weren't called from `npm test`
PATH="$PWD/node_modules/.bin:$PATH"

# SERVER_PID=0
PACKAGER_OUT="$SRCROOT/packager_out.txt"
RUN_STITCH_IN_FORGROUND=""

die() {
  echo "$@" >&2
  exit 1
}

start_server() {
  echo "test.sh: starting stitch"
  if [ "$CI_RUN" == "true" ]; then
    echo "CI Run detected, not manually starting a server"
    return;
  fi
  RUN_STITCH_IN_FORGROUND="$RUN_STITCH_IN_FORGROUND" ./scripts/start-sync-server.sh
}

stop_server() {
  echo stopping server
  if [[ -n "$STITCH_DOCKER_ID" ]] ; then
    echo "stopping the docker instance that we started earlier: ${STITCH_DOCKER_ID}"
    docker stop "$STITCH_DOCKER_ID"
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

check_test_results() {
  echo "Checking tests results"
  if grep -q "REALM_FAILING_TESTS" $(pwd)/build/out.txt; then
      echo "*** REALM JS TESTS FAILED. See tests results above ***"
      exit 20
  else
      echo "*** $1 SUCCESS ***"
  fi
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

# use npm v7
npm install -g npm@7

# Remove cached packages
rm -rf ~/.yarn-cache/npm-realm-*

case "$TARGET" in
"check-environment")
  npm run check-environment
  ;;
"license-check")
  [[ $CONFIGURATION == 'Debug' ]] && exit 0
  npm run license-check
  ;;
"jsdoc")
  [[ $CONFIGURATION == 'Debug' ]] && exit 0
  npm run jsdoc
  ;;
"start-server")
  RUN_STITCH_IN_FORGROUND=true
  start_server
  ;;
"node")
  npm run check-environment
  if [ "$CI_RUN" == "true" ]; then
    npm ci
  else
    npm ci --build-from-source=realm --realm_enable_sync=${USE_REALM_SYNC} --use_realm_debug=${USE_REALM_DEBUG}
  fi
  start_server

  # Change to a temp directory.
  cd "$(mktemp -q -d -t realm.node.XXXXXX)"
  test_temp_dir=$PWD # set it to be cleaned at exit

  pushd "$SRCROOT/tests"
  if [ "$CI_RUN" == "true" ]; then
    npm ci
  else
    npm ci --build-from-source=realm --realm_enable_sync=${USE_REALM_SYNC} --use_realm_debug=${USE_REALM_DEBUG}
  fi
  npm run test
  popd
  stop_server
  ;;
"test-runners")
  npm run check-environment
  npm ci --build-from-source=realm --use_realm_debug=${USE_REALM_DEBUG}
  npm run test-runners
  ;;
*)
  echo "Invalid target '${TARGET}'"
  exit 1
esac
