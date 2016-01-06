include_directories(impl)

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
