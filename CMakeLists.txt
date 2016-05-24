cmake_minimum_required(VERSION 3.2.0)

set(CMAKE_BUILD_TYPE Debug CACHE STRING "")
project(realm-object-store)

list(APPEND CMAKE_MODULE_PATH "${CMAKE_CURRENT_SOURCE_DIR}/CMake")

include(CodeCoverage)
include(CompilerFlags)
include(Sanitizers)

include(RealmCore)
set(REALM_CORE_VERSION "1.0.1" CACHE STRING "")
use_realm_core(${REALM_CORE_VERSION})

include_directories(${REALM_CORE_INCLUDE_DIR} src external/pegtl)

add_subdirectory(src)
add_subdirectory(tests)
