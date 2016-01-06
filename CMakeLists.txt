project(realm-object-store)

cmake_minimum_required(VERSION 3.4.0)
list(APPEND CMAKE_MODULE_PATH "${CMAKE_CURRENT_SOURCE_DIR}/CMake")

include(CompilerFlags)

include(RealmCore)
download_realm_core(0.95.5)

include_directories(${REALM_CORE_INCLUDE_DIR} ${CMAKE_CURRENT_SOURCE_DIR} impl external/pegtl)

set(SOURCES
    index_set.cpp
    list.cpp
    object_schema.cpp
    object_store.cpp
    results.cpp
    schema.cpp
    shared_realm.cpp
    impl/transact_log_handler.cpp
    parser/parser.cpp
    parser/query_builder.cpp)

if(APPLE)
    include_directories(impl/apple)
    list(APPEND SOURCES impl/apple/external_commit_helper.cpp)
    find_library(CF_LIBRARY CoreFoundation)
endif()

add_library(realm-object-store SHARED ${SOURCES})
target_link_libraries(realm-object-store realm ${CF_LIBRARY})
