
# If the developer directory is not set, use the default Xcode path
SELECTED_DEVELOPER_DIR="$(xcode-select -p)"
DEVELOPER_DIR="${DEVELOPER_DIR:-${SELECTED_DEVELOPER_DIR}}"

PROJECT_ROOT=$(pwd)
BINDGEN_PATH=$PROJECT_ROOT/bindgen

pushd $PROJECT_ROOT/react-native/ios

mkdir -p build
pushd build

# Configure CMake project
SDKROOT="$DEVELOPER_DIR/Contents/Developer/Platforms/iPhoneOS.platform/Developer/SDKs/iPhoneOS.sdk/" cmake "$BINDGEN_PATH" -GXcode \
    -DCMAKE_TOOLCHAIN_FILE="$BINDGEN_PATH/vendor/realm-core/tools/cmake/xcode.toolchain.cmake" \
    -DCMAKE_ARCHIVE_OUTPUT_DIRECTORY="$(pwd)/out/$<CONFIG>\$EFFECTIVE_PLATFORM_NAME" \
