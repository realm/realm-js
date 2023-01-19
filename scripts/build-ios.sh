#!/usr/bin/env bash

set -e
set -o pipefail

# Start in the root directory of the project.
cd "$(dirname "$0")/.."
PROJECT_ROOT=$(pwd)
SCRIPT=$(basename "${BASH_SOURCE[0]}")

function usage {
    echo "Usage: ${SCRIPT} [-c <configuration>] [<platforms>]"
    echo ""
    echo "Arguments:"
    echo "   -c : build configuration (Debug or Release)"
    echo "   <platforms> : platforms to build for (catalyst, ios, or simulator)"
    exit 1;
}

CONFIGURATION=Release
SUPPORT_PLATFORMS=(catalyst ios simulator)

function is_supported_platform(){
    for platform in "${SUPPORT_PLATFORMS[@]}"; do
        [[ "${platform}" == $1 ]] && return 0
    done
    return 1
}

# Parse the options
while getopts ":c:" opt; do
    case "${opt}" in
        c) CONFIGURATION=${OPTARG};;
        *) usage;;
    esac
done

shift $((OPTIND-1))
PLATFORMS=($@)

if [ -z ${PLATFORMS} ]; then
    echo "No platform given. building all platforms...";
    PLATFORMS=(ios catalyst simulator)
else
    echo "Building for...";
    for check_platform in "${PLATFORMS[@]}"; do
        if ! is_supported_platform $check_platform; then
            echo "${check_platform} is not a supported platform"
            usage
            exit 1
        fi
        echo ${check_platform};
    done
fi

DESTINATIONS=()
LIBRARIES=()
BUILD_LIB_CMDS=()

for platform in "${PLATFORMS[@]}"; do
    case "$platform" in
        ios)
            DESTINATIONS+=(-destination 'generic/platform=iOS')
            LIBRARIES+=(-library ./out/$CONFIGURATION-iphoneos/librealm-js-ios.a -headers ./_include)
            BUILD_LIB_CMDS+=("xcrun libtool -static -o ./out/$CONFIGURATION-iphoneos/librealm-js-ios.a ./out/$CONFIGURATION-iphoneos/*.a")
        ;;
        catalyst)
            DESTINATIONS+=(-destination 'platform=macOS,arch=x86_64,variant=Mac Catalyst')
            LIBRARIES+=(-library ./out/$CONFIGURATION-maccatalyst/librealm-js-ios.a -headers ./_include)
            BUILD_LIB_CMDS+=("xcrun libtool -static -o ./out/$CONFIGURATION-maccatalyst/librealm-js-ios.a ./out/$CONFIGURATION-maccatalyst/*.a")
        ;;
        simulator)
            DESTINATIONS+=(-destination 'generic/platform=iOS Simulator')
            LIBRARIES+=(-library ./out/$CONFIGURATION-iphonesimulator/librealm-js-ios.a -headers ./_include)
            BUILD_LIB_CMDS+=("xcrun libtool -static -o ./out/$CONFIGURATION-iphonesimulator/librealm-js-ios.a ./out/$CONFIGURATION-iphonesimulator/*.a")
        ;;
        *)
            echo "${platform} not supported"
            usage
            exit 1
        ;;
    esac
done

pushd react-native/ios

mkdir -p build
pushd build

# If the developer directory is not set, use the default Xcode path
SELECTED_DEVELOPER_DIR="$(xcode-select -p)"
DEVELOPER_DIR="${DEVELOPER_DIR:-${SELECTED_DEVELOPER_DIR}}"

# Configure CMake project
SDKROOT="$DEVELOPER_DIR/Contents/Developer/Platforms/iPhoneOS.platform/Developer/SDKs/iPhoneOS.sdk/" cmake "$PROJECT_ROOT" -GXcode \
    -DCMAKE_TOOLCHAIN_FILE="$PROJECT_ROOT/vendor/realm-core/tools/cmake/xcode.toolchain.cmake" \
    -DCMAKE_ARCHIVE_OUTPUT_DIRECTORY="$(pwd)/out/$<CONFIG>\$EFFECTIVE_PLATFORM_NAME" \

DEVELOPER_DIR="$DEVELOPER_DIR" xcodebuild build \
    -scheme realm-js-ios \
    "${DESTINATIONS[@]}" \
    -configuration $CONFIGURATION \
    CC="$PROJECT_ROOT/scripts/ccache-clang.sh" \
    CXX="$PROJECT_ROOT/scripts/ccache-clang++.sh" \
    ONLY_ACTIVE_ARCH=NO \
    BUILD_LIBRARY_FOR_DISTRIBUTION=YES \
    SUPPORTS_MACCATALYST=YES

for cmd in "${BUILD_LIB_CMDS[@]}"; do
    eval "${cmd}"
done

rm -rf _include
mkdir -p _include/realm-js-ios
cp "$PROJECT_ROOT"/src/jsi/jsi_init.h _include/realm-js-ios/

rm -rf ../realm-js-ios.xcframework
xcodebuild -create-xcframework \
    "${LIBRARIES[@]}" \
    -output ../realm-js-ios.xcframework
