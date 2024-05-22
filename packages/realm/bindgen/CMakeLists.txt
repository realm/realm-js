# The initial part of this file is basically just copied from the root package CML files.
# TODO: look into how to commonize some of this.

include(CheckCXXCompilerFlag)

# compiling for Node.js, need to set up toolchains before project() call
if(DEFINED CMAKE_JS_VERSION)
    if(CMAKE_HOST_SYSTEM_NAME STREQUAL "Windows")
        set(CMAKE_SYSTEM_VERSION 8.1)
        if(CMAKE_GENERATOR_PLATFORM MATCHES "^[Ww][Ii][Nn]32$")
            set(VCPKG_TARGET_TRIPLET "x86-windows-static" CACHE STRING "")
        elseif(CMAKE_GENERATOR_PLATFORM MATCHES "^[Xx]64$")
            set(VCPKG_TARGET_TRIPLET "x64-windows-static" CACHE STRING "")
        else()
            message(FATAL_ERROR "Unable to deduce vcpkg target triplet (from '${NODE_ARCH}')")
        endif()
    elseif(APPLE)
      set(CMAKE_OSX_DEPLOYMENT_TARGET "10.13")
      if(NODE_ARCH STREQUAL "arm64")
        set(CMAKE_OSX_ARCHITECTURES "arm64" CACHE STRING "")
      else()
        set(CMAKE_OSX_ARCHITECTURES "x86_64" CACHE STRING "")
      endif()
    elseif(CMAKE_HOST_SYSTEM_NAME STREQUAL "Linux")
      if(NODE_ARCH STREQUAL "arm")
        set(CMAKE_TOOLCHAIN_FILE "${CMAKE_CURRENT_SOURCE_DIR}/vendor/realm-core/tools/cmake/armv7-linux-gnueabihf.toolchain.cmake")
        add_link_options(-fuse-ld=bfd)
        # due to how multiarch works in debian this is needed to link to the correct system libraries
        set(CMAKE_IGNORE_PATH "/usr/lib/x86_64-linux-gnu")
      elseif(NODE_ARCH STREQUAL "arm64")
        set(CMAKE_TOOLCHAIN_FILE "${CMAKE_CURRENT_SOURCE_DIR}/vendor/realm-core/tools/cmake/aarch64-linux-gnu.toolchain.cmake")
        set(CMAKE_IGNORE_PATH "/usr/lib/x86_64-linux-gnu")
        add_link_options(-fuse-ld=gold)
        add_link_options(-Wl,-z,noexecstack)
        add_link_options(-Wl,--warn-execstack)
      elseif(NODE_ARCH STREQUAL "x64")
        set(CMAKE_TOOLCHAIN_FILE "${CMAKE_CURRENT_SOURCE_DIR}/vendor/realm-core/tools/cmake/x86_64-linux-gnu.toolchain.cmake")
        add_link_options(-fuse-ld=gold)
        add_link_options(-Wl,-z,noexecstack)
        add_link_options(-Wl,--warn-execstack)
      endif()
    endif()
endif()

cmake_minimum_required(VERSION 3.17)
project(RealmJS)

# Use ccache if available
find_program(CCACHE_PROGRAM ccache)
if(CCACHE_PROGRAM)
    set_property(GLOBAL PROPERTY RULE_LAUNCH_COMPILE "${CCACHE_PROGRAM}")
endif()

# Copied from Realm Core's CMakeList.txt
function(add_cxx_flag_if_supported flag)
    if(flag MATCHES "^-Wno-")
        # Compilers ignore unknown -Wno-foo flags, so look for -Wfoo instead.
        string(REPLACE "-Wno-" "-W" check_flag ${flag})
    else()
        set(check_flag ${flag})
    endif()

    check_cxx_compiler_flag(${check_flag} HAVE${check_flag})
    if(HAVE${check_flag})
        add_compile_options($<$<COMPILE_LANGUAGE:CXX>:${flag}>)
    endif()
endfunction()

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

set(CMAKE_CXX_VISIBILITY_PRESET hidden)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)
set(CMAKE_MSVC_RUNTIME_LIBRARY "MultiThreaded$<$<CONFIG:Debug>:Debug>")

set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

list(APPEND CMAKE_MODULE_PATH "${CMAKE_SOURCE_DIR}/cmake")

set(PACKAGE_ROOT_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../../..")

# Ninja buffers output so we need to tell tools to use colors even though stdout isn't a tty.
if(CMAKE_GENERATOR MATCHES "^Ninja")
    if (NOT MSVC)
        add_cxx_flag_if_supported(-fdiagnostics-color)
    endif()
endif()

if(DEFINED CMAKE_JS_VERSION)
    list(APPEND CMAKE_MODULE_PATH "./cmake")
    include(NodeJSTargets)
endif()

# TODO is this option dead? Do we want to support compiling with it set to OFF?
option(REALM_JS_BUILD_CORE_FROM_SOURCE "Build Realm Core from source, as opposed to downloading prebuilt binaries" ON)
if(REALM_JS_BUILD_CORE_FROM_SOURCE)
    set(REALM_BUILD_LIB_ONLY ON)
    set(REALM_ENABLE_SYNC ON)

    if(ANDROID)
        set(REALM_ANDROID ON)
    endif()

    add_subdirectory(vendor/realm-core EXCLUDE_FROM_ALL)
endif()

add_library(realm-js OBJECT)

target_link_libraries(realm-js Realm::ObjectStore)

#############################################################
# The rest of this file is custom to the binding generator. #
#############################################################

# TODO look into how to sync our warning flags with core
# TODO consider -Werror
if (MSVC)
    target_compile_options(realm-js PRIVATE /W3)
else()
    target_compile_options(realm-js PRIVATE -Wall -Wextra)
endif()

target_include_directories(realm-js PRIVATE "${CMAKE_CURRENT_SOURCE_DIR}/src")

set(SDK_DIR ${CMAKE_CURRENT_SOURCE_DIR}/../)
set(BINDING_DIR ${SDK_DIR}/binding)

target_include_directories(realm-js PRIVATE "${BINDING_DIR}")


file(GLOB_RECURSE SDK_TS_FILES
    LIST_DIRECTORIES false
    CONFIGURE_DEPENDS
    ${SDK_DIR}/bindgen/src/*.ts
)

# Each template command should include its file as an explicit dependency.
# This avoids needing to re-run all generators for changes that could only affect one of them.
list(FILTER SDK_TS_FILES EXCLUDE REGEX "templates/[^/]*\.ts$")

set(JS_SPEC_FILE ${SDK_DIR}/bindgen/js_spec.yml)
set(JS_OPT_IN_FILE ${SDK_DIR}/bindgen/js_opt_in_spec.yml)
set(NODE_OUTPUT_DIR ${SDK_DIR}/binding/build)

if(DEFINED CMAKE_JS_VERSION)
    include(node.cmake)

    bindgen(
        TEMPLATE ${SDK_DIR}/bindgen/src/templates/node.ts
        OUTPUTS node_init.cpp
        OUTDIR ${CMAKE_CURRENT_BINARY_DIR}
        SPECS ${JS_SPEC_FILE}
        OPTIN ${JS_OPT_IN_FILE}
        SOURCES ${SDK_TS_FILES}
    )

    target_sources(realm-js PRIVATE node_init.cpp ${CMAKE_JS_SRC} ${BINDING_DIR}/node/platform.cpp)
else()
    message(FATAL_ERROR "See ../binding for more information on pre-building for other platforms")
endif()
