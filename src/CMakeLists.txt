set(SOURCES
    index_set.cpp
    list.cpp
    object_schema.cpp
    object_store.cpp
    results.cpp
    schema.cpp
    shared_realm.cpp
    impl/async_query.cpp
    impl/realm_coordinator.cpp
    impl/transact_log_handler.cpp
    parser/parser.cpp
    parser/query_builder.cpp)

set(HEADERS
    index_set.hpp
    list.hpp
    object_schema.hpp
    object_store.hpp
    results.hpp
    schema.hpp
    shared_realm.hpp
    impl/cached_realm.hpp
    impl/cached_realm_base.hpp
    impl/external_commit_helper.hpp
    impl/transact_log_handler.hpp
    parser/parser.hpp
    parser/query_builder.hpp
    util/atomic_shared_ptr.hpp)

if(APPLE)
    list(APPEND SOURCES
        impl/apple/cached_realm.cpp
        impl/apple/external_commit_helper.cpp)
    list(APPEND HEADERS
        impl/apple/cached_realm.hpp
        impl/apple/external_commit_helper.hpp)
    find_library(CF_LIBRARY CoreFoundation)
else()
    list(APPEND SOURCES
        impl/generic/external_commit_helper.cpp)
    list(APPEND HEADERS
        impl/generic/cached_realm.hpp
        impl/generic/external_commit_helper.hpp)
endif()

add_library(realm-object-store SHARED ${SOURCES} ${HEADERS})
target_link_libraries(realm-object-store realm ${CF_LIBRARY})
