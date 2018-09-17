cmake_minimum_required(VERSION 3.2.0)

project(realm-js CXX)

list(APPEND CMAKE_MODULE_PATH "${CMAKE_CURRENT_SOURCE_DIR}/src/object-store/CMake")

if(NOT REALM_PLATFORM)
  if(DEFINED CMAKE_JS_VERSION)
    add_library(NodeJS INTERFACE)
    set_target_properties(NodeJS PROPERTIES
      INTERFACE_LINK_LIBRARIES "${CMAKE_JS_LIB}"
      INTERFACE_INCLUDE_DIRECTORIES "${CMAKE_JS_INC}"
    )
    set(REALM_PLATFORM Node)
    list(REMOVE_ITEM CMAKE_CXX_FLAGS "-std=c++11")
  elseif(CMAKE_SYSTEM_NAME STREQUAL Android)
    set(ReactNative ON)
    set(REALM_PLATFORM Android)
  elseif(APPLE)
    set(ReactNative ON)
    set(REALM_PLATFORM Apple)
  endif()
endif()

if(TARGET NodeJS)
  # Node.js provides the headers and symbols for OpenSSL and Zlib
  add_library(ZLIB::ZLIB ALIAS NodeJS)
  add_library(OpenSSL::Crypto ALIAS NodeJS)
  add_library(OpenSSL::SSL ALIAS NodeJS)
else()
  if(CMAKE_SYSTEM_NAME STREQUAL "Linux")
    # set before including RealmCore.cmake which calls FindOpenSSL
    set(OPENSSL_USE_STATIC_LIBS TRUE)
    find_package(OpenSSL REQUIRED)
  endif()
  message(FATAL_ERROR bar)
  find_package(ZLIB REQUIRED)
endif()

include(CompilerFlags)

if(EXISTS "$ENV{REALM_CORE_BUILDTREE}/realm-config.cmake")
  include("$ENV{REALM_CORE_BUILDTREE}/realm-config.cmake")

  # alias targets to what ObjectStore expects
  add_library(realm INTERFACE)
  target_link_libraries(realm INTERFACE Realm::Core)
  add_library(realm-parser INTERFACE)
  target_link_libraries(realm-parser INTERFACE Realm::QueryParser)

  if(EXISTS "$ENV{REALM_SYNC_BUILDTREE}/realm-sync-config.cmake")
    include("$ENV{REALM_SYNC_BUILDTREE}/realm-sync-config.cmake")

    # alias targets to what ObjectStore expects
    add_library(realm-sync INTERFACE)
    target_link_libraries(realm-sync INTERFACE Realm::Sync)
  endif()
else()
  # run download-realm.js
endif()

set(REALM_ENABLE_SYNC ON CACHE BOOL "")
add_definitions(-DREALM_ENABLE_SYNC)

add_subdirectory(src/object-store/src)
add_subdirectory(src)