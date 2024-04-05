#!/bin/bash

set -e
set -o pipefail

# Start in the root directory of the project.
cd "$(dirname "$0")/.."

REALM_BUILD_CORE=false
PROJECT_ROOT="$PODS_TARGET_SRCROOT"
BINDGEN_PATH="$PROJECT_ROOT/bindgen"

pushd "$PROJECT_ROOT/react-native/ios"

# Should we wipe this directory first?
mkdir -p build
pushd build

# Get core version
CORE_VERSION=v$(grep "^VERSION:" "$BINDGEN_PATH/vendor/realm-core/dependencies.yml" | cut -d ':' -f2 | xargs)
TAR_FILE_NAME=realm-Release-$CORE_VERSION-$PLATFORM_NAME-devel.tar.gz

# There are only Release builds available on the CDN
CDN_URL="https://static.realm.io/downloads/core/$CORE_VERSION/$PLATFORM_NAME/Release/$TAR_FILE_NAME"

# Check if URL is valid and reachable
if ! curl --output /dev/null --silent --head --fail "$CDN_URL"; then
    echo "URL $CDN_URL is not valid or reachable."
    REALM_BUILD_CORE=true
fi

if [ "$REALM_BUILD_CORE" == "true" ]; then
    # Take homebrew installs as well
    CMAKE_DIRECTORY=$(dirname "$CMAKE_PATH")
    export PATH="$CMAKE_DIRECTORY:$PATH"

    echo "Building realm-core..."
    pushd "$PROJECT_ROOT/bindgen/vendor/realm-core"

    # The `env` call here ensures the environment variables are correctly derived.  Without this, the c/c++ compilers will not be found by cmake, when invoked from xcode
    env -i PATH="$PATH" DEVELOPER_DIR="$DEVELOPER_DIR" ./tools/build-apple-device.sh -p "$PLATFORM_NAME" -c "$CONFIGURATION" -v "$CORE_VERSION" -f -DREALM_BUILD_LIB_ONLY=1
    cp -R "_CPack_Packages/$PLATFORM_NAME/TGZ/realm-$CONFIGURATION-$CORE_VERSION-$PLATFORM_NAME/devel/*" "$PROJECT_ROOT/react-native/ios/build"
    popd
else
    # Download core prebuild and extract
    curl -o "$TAR_FILE_NAME" "$CDN_URL"
    # Check if the download was successful
    if [ -f "$TAR_FILE_NAME" ]; then
        # Extract the contents
        tar -xzf "$TAR_FILE_NAME"
        rm "$TAR_FILE_NAME"
    else
        echo "Failed to find required Realm Core libraries."
    fi
fi

pushd lib

# Debug builds add '-dbg' to the filename, but xcode has links created, so renaming is necessary
find . -type f -name "*-dbg*" | while read -r file; do
    # Construct new filename by removing '-dbg'
    newfile=$(echo "$file" | sed 's/-dbg//')
    # Rename the file
    mv "$file" "$newfile"
done

# Overwite the linked vendored libraries
cp ./*.a ../../lib

popd
