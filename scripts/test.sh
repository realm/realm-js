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

if [ "$TARGET" = "realmjs" ]; then
  xcodebuild -scheme RealmJS -configuration "$CONFIGURATION" -sdk iphonesimulator $DESTINATION build test 
elif [ "$TARGET" = "react-tests" ]; then
  pushd tests/react-test-app
  #unzip ../../target=node_modules/react_tests_node_modules.zip
  react-native start &
  popd
  
  xcodebuild -scheme RealmReact -configuration "$CONFIGURATION" -sdk iphonesimulator $DESTINATION build test
elif [ "$TARGET" = "react-example" ]; then
  pushd examples/ReactExample
  #unzip ../../target=node_modules/react_example_node_modules.zip
  react-native start &
  xcodebuild -scheme ReactExample -configuration "$CONFIGURATION" -sdk iphonesimulator build $DESTINATION
  popd
fi

pkill node || true

