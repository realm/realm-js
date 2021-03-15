include("${CMAKE_CURRENT_LIST_DIR}/../vendor/realm-core/tools/cmake/ios.toolchain.cmake")

set(CMAKE_SYSTEM_NAME iOS)
set(CMAKE_C_VISIBILITY_PRESET hidden)
set(CMAKE_CXX_VISIBILITY_PRESET hidden)
set(CMAKE_XCODE_ATTRIBUTE_IPHONEOS_DEPLOYMENT_TARGET "10.0")
