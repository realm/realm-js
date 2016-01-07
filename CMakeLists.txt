project(realm-object-store)

cmake_minimum_required(VERSION 3.2.0)
list(APPEND CMAKE_MODULE_PATH "${CMAKE_CURRENT_SOURCE_DIR}/CMake")

include(CompilerFlags)

include(RealmCore)
download_realm_core(0.95.5)

include_directories(${REALM_CORE_INCLUDE_DIR} src external/pegtl)

add_subdirectory(src)
add_subdirectory(tests)
