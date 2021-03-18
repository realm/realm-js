#!/usr/bin/env bash

set -e
set -o pipefail

# Start in the root directory of the project.
cd "$(dirname "$0")/.."
PROJECT_ROOT=$(pwd)
SCRIPT=$(basename "${BASH_SOURCE[0]}")

function usage {
    echo "Usage: ${SCRIPT} [-c <configuration>] [-s]"
    echo ""
    echo "Arguments:"
    echo "   -c : build configuration (Debug or Release)"
    echo "   -s : simulator-only build"
    exit 1;
}

CONFIGURATION=Release

# Parse the options
while getopts ":c:s" opt; do
    case "${opt}" in
        c) CONFIGURATION=${OPTARG};;
        s) SIMULATOR_ONLY=1;;
        *) usage;;
    esac
done
shift $((OPTIND-1))

pushd react-native/ios

mkdir -p build
pushd build

# Configure CMake project
cmake "$PROJECT_ROOT" -GXcode \
    -DCMAKE_TOOLCHAIN_FILE="$PROJECT_ROOT/cmake/ios.toolchain.cmake" \
    -DCMAKE_ARCHIVE_OUTPUT_DIRECTORY="$(pwd)/out/$<CONFIG>\$EFFECTIVE_PLATFORM_NAME"

destinations=(-destination 'generic/platform=iOS Simulator')
[[ -z $SIMULATOR_ONLY ]] && destinations+=(-destination 'generic/platform=iOS')

xcodebuild build \
    -scheme realm-js-ios \
    "${destinations[@]}" \
    -configuration $CONFIGURATION \
    ONLY_ACTIVE_ARCH=NO \
    BUILD_LIBRARY_FOR_DISTRIBUTION=YES

[[ -z $SIMULATOR_ONLY ]] && xcrun libtool -static -o ./out/$CONFIGURATION-iphoneos/librealm-js-ios.a ./out/$CONFIGURATION-iphoneos/*.a
xcrun libtool -static -o ./out/$CONFIGURATION-iphonesimulator/librealm-js-ios.a ./out/$CONFIGURATION-iphonesimulator/*.a

mkdir -p _include/realm-js-ios
cp "$PROJECT_ROOT"/src/jsc/{jsc_init.h,rpc.hpp} _include/realm-js-ios/

rm -rf ../realm-js-ios.xcframework
libraries=(-library ./out/$CONFIGURATION-iphonesimulator/librealm-js-ios.a -headers ./_include)
[[ -z $SIMULATOR_ONLY ]] && libraries+=(-library ./out/$CONFIGURATION-iphoneos/librealm-js-ios.a -headers ./_include)
xcodebuild -create-xcframework \
    "${libraries[@]}" \
    -output ../realm-js-ios.xcframework
