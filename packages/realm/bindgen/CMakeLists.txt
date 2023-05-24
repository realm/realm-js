# The initial part of this file is basically just copied from the root package CML files.
# TODO: look into how to commonize some of this.

include(CheckCXXCompilerFlag)

# compiling for Node.js, need to set up toolchains before project() call
if(DEFINED CMAKE_JS_VERSION)
    if(CMAKE_HOST_SYSTEM_NAME STREQUAL "Windows")
        set(CMAKE_SYSTEM_VERSION 8.1)
    elseif(APPLE)
      set(CMAKE_OSX_DEPLOYMENT_TARGET "10.9")
      if(NODE_ARCH STREQUAL "arm64")
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
    list(APPEND CMAKE_MODULE_PATH "${PACKAGE_ROOT_DIR}/cmake")
    include(NodeJSTargets)
endif()

if(EMSCRIPTEN)
    add_compile_options(-fwasm-exceptions)
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

# TODO move platform.hpp and delete this line.
target_include_directories(realm-js PRIVATE "${PACKAGE_ROOT_DIR}/src")

set(SDK_DIR ${PACKAGE_ROOT_DIR}/packages/realm)

file(GLOB_RECURSE SDK_TS_FILES
    LIST_DIRECTORIES false
    CONFIGURE_DEPENDS
    ${SDK_DIR}/bindgen/src/*.ts
)

# Each template command should include its file as an explicit dependency.
# This avoids needing to re-run all generators for changes that could only affect one of them.
list(FILTER SDK_TS_FILES EXCLUDE REGEX "templates/[^/]*\.ts$")

set(JS_SPEC_FILE ${SDK_DIR}/bindgen/js_spec.yml)
set(TYPESCRIPT_OUTPUT_DIR ${SDK_DIR}/generated/ts)

set(GENERATED_TS_FILES
    ${TYPESCRIPT_OUTPUT_DIR}/native.d.mts
    ${TYPESCRIPT_OUTPUT_DIR}/core.ts
)
bindgen(
    TEMPLATE ${SDK_DIR}/bindgen/src/templates/typescript.ts
    OUTPUTS ${GENERATED_TS_FILES}
    OUTDIR ${TYPESCRIPT_OUTPUT_DIR}
    SPECS ${JS_SPEC_FILE}
    SOURCES ${SDK_TS_FILES}
)

set(GENERATED_JS_FILES
    ${TYPESCRIPT_OUTPUT_DIR}/native-node.mjs
    ${TYPESCRIPT_OUTPUT_DIR}/native-react-native.mjs
    ${TYPESCRIPT_OUTPUT_DIR}/native-browser.mjs
)
bindgen(
    TEMPLATE ${SDK_DIR}/bindgen/src/templates/node-wrapper.ts
    OUTPUTS ${GENERATED_JS_FILES}
    OUTDIR ${TYPESCRIPT_OUTPUT_DIR}
    SPECS ${JS_SPEC_FILE}
    SOURCES ${SDK_TS_FILES}
)

add_custom_target(TypeScript ALL DEPENDS ${GENERATED_TS_FILES} ${GENERATED_JS_FILES})

if(DEFINED CMAKE_JS_VERSION)
    include(node.cmake)

    bindgen(
        TEMPLATE ${SDK_DIR}/bindgen/src/templates/node.ts
        OUTPUTS node_init.cpp
        OUTDIR ${CMAKE_CURRENT_BINARY_DIR}
        SPECS ${JS_SPEC_FILE}
        SOURCES ${SDK_TS_FILES}
    )

    target_sources(realm-js PRIVATE node_init.cpp ${CMAKE_JS_SRC} ${PACKAGE_ROOT_DIR}/src/node/platform.cpp)

elseif(EMSCRIPTEN)
    include(browser.cmake)
    bindgen(
        TEMPLATE ${SDK_DIR}/bindgen/src/templates/browser.ts
        OUTPUTS browser_init.cpp
        OUTDIR ${CMAKE_CURRENT_BINARY_DIR}
        SPECS ${JS_SPEC_FILE}
        SOURCES ${SDK_TS_FILES}
    )

    target_sources(realm-js PRIVATE browser_init.cpp ${CMAKE_JS_SRC} ${PACKAGE_ROOT_DIR}/src/browser/platform.cpp)

    set_target_properties(realm-js-wasm PROPERTIES
        RUNTIME_OUTPUT_DIRECTORY ${TYPESCRIPT_OUTPUT_DIR}
    )

else()
    include(jsi.cmake)

    bindgen(
        TEMPLATE ${SDK_DIR}/bindgen/src/templates/jsi.ts
        OUTPUTS jsi_init.cpp
        OUTDIR ${CMAKE_CURRENT_BINARY_DIR}
        SPECS ${JS_SPEC_FILE}
        SOURCES ${SDK_TS_FILES}
    )

    target_sources(realm-js PRIVATE jsi_init.cpp ${CMAKE_JS_SRC})

    if(ANDROID)
        add_subdirectory(${PACKAGE_ROOT_DIR}/src/android android)
    elseif(CMAKE_SYSTEM_NAME STREQUAL iOS)
        add_subdirectory(${PACKAGE_ROOT_DIR}/src/ios ios)
    else()
        # disabling for now to simplify the bootstrapping process.
        # message(FATAL_ERROR "Only support JSI builds for Android and iOS")
    endif()
endif()
