set(CMAKE_BUILD_TYPE Debug CACHE STRING "")
project(realm-object-store)

cmake_minimum_required(VERSION 3.2.0)
list(APPEND CMAKE_MODULE_PATH "${CMAKE_CURRENT_SOURCE_DIR}/CMake")

include(CompilerFlags)

include(RealmCore)
set(REALM_CORE_VERSION "0.97.0" CACHE STRING "")
use_realm_core(${REALM_CORE_VERSION})

include_directories(${REALM_CORE_INCLUDE_DIR} src external/pegtl)

add_subdirectory(src)
add_subdirectory(tests)
