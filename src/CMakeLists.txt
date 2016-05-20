set(SOURCES
    collection_notifications.cpp
    index_set.cpp
    list.cpp
    object_schema.cpp
    object_store.cpp
    results.cpp
    schema.cpp
    shared_realm.cpp
    impl/collection_change_builder.cpp
    impl/collection_notifier.cpp
    impl/list_notifier.cpp
    impl/realm_coordinator.cpp
    impl/results_notifier.cpp
    impl/transact_log_handler.cpp
    parser/parser.cpp
    parser/query_builder.cpp)

set(HEADERS
    collection_notifications.hpp
    index_set.hpp
    list.hpp
    object_schema.hpp
    object_store.hpp
    property.hpp
    results.hpp
    schema.hpp
    shared_realm.hpp
    impl/collection_change_builder.hpp
    impl/collection_notifier.hpp
    impl/external_commit_helper.hpp
    impl/list_notifier.hpp
    impl/realm_coordinator.hpp
    impl/results_notifier.hpp
    impl/transact_log_handler.hpp
    impl/weak_realm_notifier.hpp
    impl/weak_realm_notifier_base.hpp
    parser/parser.hpp
    parser/query_builder.hpp
    util/atomic_shared_ptr.hpp)

if(APPLE)
    list(APPEND SOURCES
        impl/apple/weak_realm_notifier.cpp
        impl/apple/external_commit_helper.cpp)
    list(APPEND HEADERS
        impl/apple/weak_realm_notifier.hpp
        impl/apple/external_commit_helper.hpp)
    find_library(CF_LIBRARY CoreFoundation)
else()
    list(APPEND SOURCES
        impl/generic/external_commit_helper.cpp)
    list(APPEND HEADERS
        impl/generic/weak_realm_notifier.hpp
        impl/generic/external_commit_helper.hpp)
endif()

add_library(realm-object-store SHARED ${SOURCES} ${HEADERS})
target_link_libraries(realm-object-store realm ${CF_LIBRARY})
