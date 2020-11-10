# compiling for Windows with vcpkg, needs to execute before the project() call
if(CMAKE_HOST_SYSTEM_NAME STREQUAL "Windows" AND CMAKE_TOOLCHAIN_FILE MATCHES "vcpkg.cmake$")
    if(CMAKE_GENERATOR_PLATFORM MATCHES "^[Ww][Ii][Nn]32$")
        set(VCPKG_TARGET_TRIPLET "x86-windows-static" CACHE STRING "")
    elseif(CMAKE_GENERATOR_PLATFORM MATCHES "^[Xx]64$")
        set(VCPKG_TARGET_TRIPLET "x64-windows-static" CACHE STRING "")
    endif()
endif()

cmake_minimum_required(VERSION 3.15)
project(RealmJS)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

set(CMAKE_CXX_VISIBILITY_PRESET hidden)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)
set(CMAKE_MSVC_RUNTIME_LIBRARY "MultiThreaded$<$<CONFIG:Debug>:Debug>")

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
