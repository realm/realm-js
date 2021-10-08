#!/bin/bash

SRCROOT=$(cd "$(dirname "$0")/.." && pwd)
PACKAGER_OUT="$SRCROOT/packager_out.txt"
LOGCAT_OUT="$SRCROOT/logcat_out.txt"
RUN_STITCH_IN_FORGROUND=""
PATH="/opt/android-sdk-linux/platform-tools:$PATH"
XCPRETTY=$(which xcpretty || true)

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

# pack realm package manually since install-local does not allow passing --ignore-scripts
echo "manually packing realm package"
npm pack .
rm -rf realm.tgz
mv realm-*.*.*.tgz realm.tgz

echo "manually packing realm tests package"
pushd tests/js
npm pack .
rm -rf realm-tests.tgz
mv realm-tests-*.*.*.tgz realm-tests.tgz
popd

pushd tests/react-test-app
echo "installing react-test-app dependencies"
npm ci --no-optional

echo "installing manually packed realm package"
npm install --save-optional  --ignore-scripts ../../realm.tgz

echo "installing manually packed realm tests package"
npm install --save-optional ../js/realm-tests.tgz

echo "Adb devices"
adb devices
echo "Resetting logcat"
adb logcat -c || true
# Despite the docs claiming -c to work, it doesn't, so `-T 1` alleviates that.
adb logcat -T 1 -s ReactNativeJS | tee "$LOGCAT_OUT" | tee $(pwd)/build/out.txt & 

# start_packager
# TODO: do not start packager, but inject the bundled js
./run-android.sh

echo "Start listening for Test completion"

TESTS_FAILED=TRUE
while :; do
if grep -q "__REALM_JS_TESTS_SUCCEEDED__" "$LOGCAT_OUT"; then
    TESTS_FAILED=FALSE
    break
elif grep -q "__REALM_JS_TESTS_FAILED__" "$LOGCAT_OUT"; then
    echo "*** REALM JS TESTS FAILED. See tests results above ***"
    break
else
    echo "Waiting for tests."
    sleep 10
fi
done

# Stop running child processes before printing results.
echo "********* TESTS COMPLETED *********";

if $TESTS_FAILED; then
  exit 20
fi