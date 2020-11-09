cmake_minimum_required(VERSION 3.15)
project(RealmJS)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

set(CMAKE_CXX_VISIBILITY_PRESET hidden)

list(APPEND CMAKE_MODULE_PATH "${CMAKE_SOURCE_DIR}/cmake")

if(DEFINED CMAKE_JS_VERSION)
    include(NodeJSTargets)
endif()

option(REALM_JS_BUILD_CORE_FROM_SOURCE "Build Realm Core from source, as opposed to downloading prebuilt binaries" ON)
if(REALM_JS_BUILD_CORE_FROM_SOURCE)
    set(REALM_BUILD_LIB_ONLY ON)
    set(REALM_ENABLE_SYNC ON)

    add_subdirectory(vendor/realm-core EXCLUDE_FROM_ALL)
endif()

add_subdirectory(src)
