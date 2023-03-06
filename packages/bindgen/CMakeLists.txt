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
        endif()
        if(DEFINED ENV{VCPKG_ROOT})
            set(CMAKE_TOOLCHAIN_FILE "$ENV{VCPKG_ROOT}/scripts/buildsystems/vcpkg.cmake")
        else()
            set(CMAKE_TOOLCHAIN_FILE "C:\\src\\vcpkg\\scripts\\buildsystems\\vcpkg.cmake")
        endif()
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

cmake_minimum_required(VERSION 3.15)
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

set(PACKAGE_ROOT_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../..")

# Ninja buffers output so we need to tell tools to use colors even though stdout isn't a tty.
if(CMAKE_GENERATOR MATCHES "^Ninja")
    if (NOT MSVC)
        add_cxx_flag_if_supported(-fdiagnostics-color)
    endif()
    set(NODE_FORCE_COLOR ${CMAKE_COMMAND} -E env FORCE_COLOR=1)
endif()

if(DEFINED CMAKE_JS_VERSION)
    list(APPEND CMAKE_MODULE_PATH "${CMAKE_SOURCE_DIR}/../../cmake")
    include(NodeJSTargets)
endif()

option(REALM_JS_BUILD_CORE_FROM_SOURCE "Build Realm Core from source, as opposed to downloading prebuilt binaries" ON)
if(REALM_JS_BUILD_CORE_FROM_SOURCE)
    set(REALM_BUILD_LIB_ONLY ON)
    set(REALM_ENABLE_SYNC ON)

    if(ANDROID)
        set(REALM_ANDROID ON)
    endif()

    add_subdirectory(../../vendor/realm-core # source path
        realm-core # subdir in output directories
        EXCLUDE_FROM_ALL
    )
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
target_include_directories(realm-js PRIVATE "${CMAKE_CURRENT_SOURCE_DIR}/../../src")

file(GLOB_RECURSE TS_FILES
    LIST_DIRECTORIES false
    CONFIGURE_DEPENDS
    src/*.ts
)

# Each template command should include its file as an explicit dependency.
# This avoids needing to re-run all generators for changes that could only affect one of them.
list(FILTER TS_FILES EXCLUDE REGEX "templates/[^/]*\.ts$")
list(FILTER TS_FILES EXCLUDE REGEX "tests/[^/]*\.ts$")

set(CORE_SPEC_FILE ${CMAKE_CURRENT_SOURCE_DIR}/spec.yml)
set(JS_SPEC_FILE ${CMAKE_CURRENT_SOURCE_DIR}/js_spec.yml)
set(SPEC_FILES ${CORE_SPEC_FILE} ${JS_SPEC_FILE})
set(SPEC_ARGS --spec ${CORE_SPEC_FILE} --spec ${JS_SPEC_FILE})

# Unfortunately this path is hard coded in the reader.
# TODO 
set(SCHEMA_FILE ${CMAKE_CURRENT_SOURCE_DIR}/generated/spec.schema.json)

set(SDK_DIR ${CMAKE_CURRENT_SOURCE_DIR}/../realm)

set(TYPESCRIPT_OUTPUT_DIR ${SDK_DIR}/generated/ts)

set(GENERATED_TS_FILES
    ${TYPESCRIPT_OUTPUT_DIR}/native.d.mts
    ${TYPESCRIPT_OUTPUT_DIR}/core.ts
)
set(GENERATED_JS_FILES
    ${TYPESCRIPT_OUTPUT_DIR}/native.mjs
    ${TYPESCRIPT_OUTPUT_DIR}/native-rn.mjs
)

set(NPX ${NODE_FORCE_COLOR} npx)

add_custom_command(
    OUTPUT ${SCHEMA_FILE}
    COMMAND ${NPX} typescript-json-schema ${CMAKE_CURRENT_SOURCE_DIR}/tsconfig.json RelaxedSpec --include ${CMAKE_CURRENT_SOURCE_DIR}/src/spec/relaxed-model.ts --out ${SCHEMA_FILE} --required --noExtraProps --aliasRefs
    VERBATIM
    MAIN_DEPENDENCY src/spec/relaxed-model.ts
    DEPENDS
        # Note: The json-schema generation task is extremely slow so we don't want to rerun it any time any TS file is modified.
        # Instead we assume that it will only transitively import the listed files.
        # (Right now there are no imports)
)

add_custom_target(SpecJsonSchema DEPENDS ${SCHEMA_FILE})

add_custom_command(
    OUTPUT ${GENERATED_TS_FILES}
    COMMAND ${NPX} tsx -- ${CMAKE_CURRENT_SOURCE_DIR}/realm-bindgen.ts ${SPEC_ARGS} --template typescript --output ${TYPESCRIPT_OUTPUT_DIR}
    VERBATIM
    MAIN_DEPENDENCY src/templates/typescript.ts
    DEPENDS
        ${SPEC_FILES}
        SpecJsonSchema
        ${TS_FILES}
)

add_custom_target(TypeScript ALL DEPENDS ${GENERATED_TS_FILES} ${GENERATED_JS_FILES})

# For now leaving the native.mjs file as a "common" file between node and jsi.
# We may need them to differ, but for now it is simpler to avoid that.
# One issue we may run into when splitting is that they will need to be different files, otherwise ninja will get confused.
add_custom_command(
    OUTPUT ${GENERATED_JS_FILES}
    COMMAND ${NPX} tsx -- ${CMAKE_CURRENT_SOURCE_DIR}/realm-bindgen.ts ${SPEC_ARGS} --template node-wrapper --output ${TYPESCRIPT_OUTPUT_DIR}
    VERBATIM
    MAIN_DEPENDENCY src/templates/node-wrapper.ts
    DEPENDS
        ${SPEC_FILES}
        SpecJsonSchema
        ${TS_FILES}
)

if(DEFINED CMAKE_JS_VERSION)
    include(node.cmake)

    add_custom_command(
        OUTPUT node_init.cpp
        COMMAND ${NPX} tsx -- ${CMAKE_CURRENT_SOURCE_DIR}/realm-bindgen.ts ${SPEC_ARGS} --template node --output ${CMAKE_CURRENT_BINARY_DIR}
        VERBATIM
        MAIN_DEPENDENCY src/templates/node.ts
        DEPENDS
            ${SPEC_FILES}
            SpecJsonSchema
            ${TS_FILES}
    )

    target_sources(realm-js PRIVATE node_init.cpp ${CMAKE_JS_SRC} ../../src/node/platform.cpp)
else()
    include(jsi.cmake)

    add_custom_command(
        OUTPUT jsi_init.cpp
        COMMAND ${NPX} tsx -- ${CMAKE_CURRENT_SOURCE_DIR}/realm-bindgen.ts ${SPEC_ARGS} --template jsi --output ${CMAKE_CURRENT_BINARY_DIR}
        VERBATIM
        MAIN_DEPENDENCY src/templates/jsi.ts
        DEPENDS
            ${SPEC_FILES}
            SpecJsonSchema
            ${TS_FILES}
    )

    target_sources(realm-js PRIVATE jsi_init.cpp ${CMAKE_JS_SRC})

    if(ANDROID)
        add_subdirectory(../../src/android android)
    elseif(CMAKE_SYSTEM_NAME STREQUAL iOS)
        add_subdirectory(../../src/ios ios)
    else()
        # disabling for now to simplify the bootstrapping process.
        # message(FATAL_ERROR "Only support JSI builds for Android and iOS")
    endif()
endif()
