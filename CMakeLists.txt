# compiling for Node.js, need to set up toolchains before project() call
if(DEFINED CMAKE_JS_VERSION)
    if(CMAKE_HOST_SYSTEM_NAME STREQUAL "Windows")
        set(CMAKE_SYSTEM_VERSION 8.1)
        if(CMAKE_GENERATOR_PLATFORM MATCHES "^[Ww][Ii][Nn]32$")
            set(VCPKG_TARGET_TRIPLET "x86-windows-static" CACHE STRING "")
        elseif(CMAKE_GENERATOR_PLATFORM MATCHES "^[Xx]64$")
            set(VCPKG_TARGET_TRIPLET "x64-windows-static" CACHE STRING "")
        endif()
        if(DEFINED ENV{VCPKG_ROOT})
            set(CMAKE_TOOLCHAIN_FILE "$ENV{VCPKG_ROOT}/scripts/buildsystems/vcpkg.cmake")
        else()
            set(CMAKE_TOOLCHAIN_FILE "C:\\src\\vcpkg\\scripts\\buildsystems\\vcpkg.cmake")
        endif()
    elseif(APPLE)
        set(CMAKE_TOOLCHAIN_FILE "${CMAKE_CURRENT_LIST_DIR}/vendor/realm-core/tools/cmake/macosx.toolchain.cmake")
        if(DEFINED ENV{NODE_ARCH_ARM})
            set(CMAKE_OSX_ARCHITECTURES "arm64" CACHE STRING "")
        else()
            set(CMAKE_OSX_ARCHITECTURES "x86_64" CACHE STRING "")
        endif()
    elseif(CMAKE_HOST_SYSTEM_NAME STREQUAL "Linux")
        add_link_options(-fuse-ld=gold)
        add_link_options(-Wl,-z,noexecstack)
	    add_link_options(-Wl,--warn-execstack)
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

set(PACKAGE_ROOT_DIR ${CMAKE_CURRENT_SOURCE_DIR})

# Load dependency info from dependencies.list into REALM_FOO_VERSION variables.
set(DEPENDENCIES_FILE "dependencies.list" CACHE STRING "path to dependencies list")
file(STRINGS ${DEPENDENCIES_FILE} DEPENDENCIES)
foreach(DEPENDENCY IN LISTS DEPENDENCIES)
    string(REGEX MATCHALL "([^=]+)" COMPONENT_AND_VERSION ${DEPENDENCY})
    list(GET COMPONENT_AND_VERSION 0 COMPONENT)
    list(GET COMPONENT_AND_VERSION 1 VERSION)
    if(COMPONENT MATCHES "_VERSION$")
        message(DEBUG "Setting ${COMPONENT}=${VERSION}")
        set(${COMPONENT} ${VERSION})
    endif()
endforeach()

if(DEFINED CMAKE_JS_VERSION)
    include(NodeJSTargets)
endif()

option(REALM_JS_BUILD_CORE_FROM_SOURCE "Build Realm Core from source, as opposed to downloading prebuilt binaries" ON)
if(REALM_JS_BUILD_CORE_FROM_SOURCE)
    set(REALM_BUILD_LIB_ONLY ON)
    set(REALM_ENABLE_SYNC ON)

    if(ANDROID)
        set(REALM_ANDROID ON)
    endif()

    add_subdirectory(vendor/realm-core EXCLUDE_FROM_ALL)
else()
    if(NOT ANDROID)
        message(FATAL_ERROR "Building with Realm Core prebuilt binaries is only supported on Android")
    endif()

    message(STATUS "Using Realm Core ${REALM_CORE_VERSION} prebuilt binaries")

    set(REALM_CORE_PLATFORM Android-${ANDROID_ABI})
    # TODO: Revising the "devel" part of the following line
    set(REALM_CORE_FILENAME realm-${CMAKE_BUILD_TYPE}-v${REALM_CORE_VERSION}-${REALM_CORE_PLATFORM}-devel)
    set(REALM_CORE_PATH ${CMAKE_BINARY_DIR}/${REALM_CORE_FILENAME})
    set(REALM_CORE_CMAKE_CONFIG ${REALM_CORE_PATH}/lib/cmake/Realm/RealmConfig.cmake)
    if(EXISTS ${REALM_CORE_CMAKE_CONFIG})
        message(STATUS "Skipping download of Realm Core (it's already there)")
    else()
        set(REALM_CORE_ARCHIVE_PATH ${CMAKE_BINARY_DIR}/${REALM_CORE_FILENAME}.tar.gz)
        message(STATUS "Downloading Realm Core prebuilt binaries")
        file(DOWNLOAD "https://static.realm.io/downloads/core/${REALM_CORE_FILENAME}.tar.gz" "${REALM_CORE_ARCHIVE_PATH}" STATUS DOWNLOAD_STATUS)
        # Separate the returned status code, and error message.
        list(GET DOWNLOAD_STATUS 0 STATUS_CODE)
        list(GET DOWNLOAD_STATUS 1 ERROR_MESSAGE)
        # Check if download was successful.
        if(${STATUS_CODE} EQUAL 0)
            message(STATUS "Download of Realm Core completed successfully")
        else()
            message(FATAL_ERROR "Error occurred during download: ${ERROR_MESSAGE} (${STATUS_CODE})")
        endif()

        # TODO: Await a core release with fixed binaries and uri.hpp file and remove this
        if(${ANDROID_ABI} MATCHES "^x86")
            set(REALM_CORE_ARCHIVE_PATH "/Users/kraen.hansen/Downloads/realm-Debug-v11.4.1-48-g1787cfadf-Android-${ANDROID_ABI}-devel.tar.gz")
        else()
            message(FATAL_ERROR "Unsupported ANDROID_ABI (got ${ANDROID_ABI})")
        endif()

        message(STATUS "Uncompressing Realm Core")
        file(MAKE_DIRECTORY ${REALM_CORE_PATH})
        execute_process(COMMAND "${CMAKE_COMMAND}"
            -E tar xfz ${REALM_CORE_ARCHIVE_PATH}
            WORKING_DIRECTORY ${REALM_CORE_PATH}
        )
        # TODO: Solve this
        execute_process(COMMAND "${CMAKE_COMMAND}"
            -E copy ${PACKAGE_ROOT_DIR}/vendor/realm-core/src/realm/util/uri.hpp ${REALM_CORE_PATH}/include/realm/util/uri.hpp
        )
    endif()

    message(STATUS "Incuding Realm Core CMAKE configuration")
    include(${REALM_CORE_CMAKE_CONFIG})

    # set_property(TARGET realm PROPERTY INTERFACE_INCLUDE_DIRECTORIES ${REALM_CORE_PATH}/include)
endif()

add_subdirectory(src)
