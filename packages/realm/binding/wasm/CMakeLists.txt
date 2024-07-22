# The initial part of this file is basically just copied from the root package CML files.
# TODO: look into how to commonize some of this.

include(CheckCXXCompilerFlag)

set(SDK_DIR ${CMAKE_CURRENT_SOURCE_DIR}/../../)
set(BINDGEN_DIR ${SDK_DIR}/bindgen)
set(BINDING_DIR ${SDK_DIR}/binding)

cmake_minimum_required(VERSION 3.17)
project(RealmJS)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# set(CMAKE_CXX_VISIBILITY_PRESET hidden)
# set(CMAKE_POSITION_INDEPENDENT_CODE ON)
# set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

set(REALM_BUILD_LIB_ONLY ON)
set(REALM_ENABLE_SYNC ON)

add_subdirectory(${BINDGEN_DIR}/vendor/realm-core realm-core EXCLUDE_FROM_ALL)

add_library(realm-js OBJECT)
target_link_libraries(realm-js Realm::ObjectStore)
target_compile_options(realm-js PRIVATE -Wall -Wextra)
target_include_directories(realm-js PRIVATE "${BINDGEN_DIR}/src")
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
set(JS_OPT_IN_FILE ${SDK_DIR}/bindgen/wasm_opt_in_spec.yml)
set(WASM_OUTPUT_DIR ${SDK_DIR}/prebuilds/wasm)

bindgen(
    TEMPLATE ${SDK_DIR}/bindgen/src/templates/wasm.ts
    OUTPUTS wasm_init.cpp
    OUTDIR ${CMAKE_CURRENT_BINARY_DIR}
    SPECS ${JS_SPEC_FILE}
    OPTIN ${JS_OPT_IN_FILE}
    SOURCES ${SDK_TS_FILES}
)

target_sources(realm-js PRIVATE wasm_init.cpp ${CMAKE_JS_SRC} ${BINDING_DIR}/wasm/platform.cpp)

add_executable(realm-js-wasm)
target_link_options(realm-js-wasm PRIVATE -d -sALLOW_MEMORY_GROWTH=1 -sLLD_REPORT_UNDEFINED -sFETCH=1 -lembind -fwasm-exceptions -sEXPORT_ES6=1 -sWASM_BIGINT=1 -sENVIRONMENT=web -sSTACK_SIZE=131072 --pre-js=../web_polyfill.js)
target_link_libraries(realm-js-wasm realm-js)

set_target_properties(realm-js-wasm PROPERTIES
    RUNTIME_OUTPUT_DIRECTORY ${WASM_OUTPUT_DIR}
)
SET(CMAKE_EXECUTABLE_SUFFIX ".mjs")
