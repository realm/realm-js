#!/bin/bash

set -e
set -o pipefail

# Start in the root directory of the project.
cd "$(dirname "$0")/.."

# Need npx and node
NODE_DIRECTORY=$(dirname "$NODE_PATH")
export PATH="$NODE_DIRECTORY:$PATH"

# Take homebrew installs as well
CMAKE_DIRECTORY=$(dirname "$CMAKE_PATH")
export PATH="$CMAKE_DIRECTORY:$PATH"

PROJECT_ROOT=$(pwd)
SDK_PATH=$PROJECT_ROOT
BINDGEN_PATH=$PROJECT_ROOT/bindgen
BINDING_PATH=$PROJECT_ROOT/binding
SCRIPT=$(basename "${BASH_SOURCE[0]}")

function usage {
    echo "Usage: ${SCRIPT} [-c <configuration>] [<platforms>]"
    echo ""
    echo "Arguments:"
    echo "   -c : build configuration (Debug or Release)"
    echo "   <platforms> : platforms to build for (maccatalyst, ios, or iphonesimulator)"
    exit 1;
}

CONFIGURATION=Release
SUPPORT_PLATFORMS=(maccatalyst ios iphonesimulator)

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

echo "Configuration: ${CONFIGURATION}"

shift $((OPTIND-1))
PLATFORMS=($@)

if [ -z ${PLATFORMS} ]; then
    echo "No platform given. building all platforms...";
    PLATFORMS=(ios maccatalyst iphonesimulator)
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

# TODO: Can this be infered from xcode env variables? (maccatalyst appears to be a unicorn)
for platform in "${PLATFORMS[@]}"; do
    case "$platform" in
        ios)
            DESTINATIONS+=(-destination 'generic/platform=iOS')
        ;;
        maccatalyst)
            DESTINATIONS+=(-destination 'platform=macOS,arch=x86_64,variant=Mac Catalyst')
        ;;
        iphonesimulator)
            DESTINATIONS+=(-destination 'generic/platform=iOS Simulator')
        ;;
        *)
            echo "${platform} not supported"
            usage
            exit 1
        ;;
    esac
done

pushd $SDK_PATH/react-native/ios

mkdir -p build
pushd build

# If the developer directory is not set, use the default Xcode path
SELECTED_DEVELOPER_DIR="$(xcode-select -p)"
DEVELOPER_DIR="${DEVELOPER_DIR:-${SELECTED_DEVELOPER_DIR}}"

# Configure CMake project
env DEVELOPER_DIR="$DEVELOPER_DIR" SDKROOT="$SDKROOT" $CMAKE_PATH "$BINDGEN_PATH" -GXcode \
    -DCMAKE_TOOLCHAIN_FILE="$BINDGEN_PATH/vendor/realm-core/tools/cmake/xcode.toolchain.cmake" \
    -DCMAKE_ARCHIVE_OUTPUT_DIRECTORY="$(pwd)/out" \


DEVELOPER_DIR="$DEVELOPER_DIR" xcodebuild build \
    -scheme realm-js-ios \
    "${DESTINATIONS[@]}" \
    -configuration $CONFIGURATION \
    ONLY_ACTIVE_ARCH=NO \
    BUILD_LIBRARY_FOR_DISTRIBUTION=YES \
    SUPPORTS_MACCATALYST=YES

# copy needed headers into project
rm -rf _include
mkdir -p _include/realm-js-ios
cp "$BINDING_PATH"/jsi/jsi_init.h _include/realm-js-ios/

# copy built into a unified location
rm -rf libs
mkdir libs
cp out/$CONFIGURATION/*.a libs

# Rename the *.a files so there are the same regardles if configuration was debug or release

pushd libs

find . -type f -name "*-dbg*" | while read -r file; do
    # Construct new filename by removing '-dbg'
    newfile=$(echo "$file" | sed 's/-dbg//')
    # Rename the file
    mv "$file" "$newfile"
done
