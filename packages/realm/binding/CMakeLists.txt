cmake_minimum_required(VERSION 3.17)
project(RealmJS)

if(DEFINED CMAKE_JS_VERSION)
    # temporary cache bust
    add_library(realm-js-shared OBJECT)

    target_link_libraries(realm-js-shared PUBLIC Realm::ObjectStore)
    target_include_directories(realm-js-shared PUBLIC ${CMAKE_CURRENT_SOURCE_DIR})

    add_subdirectory(node)
elseif(ANDROID)
    add_subdirectory(jsi)
    add_subdirectory(android)
elseif(CMAKE_SYSTEM_NAME STREQUAL iOS)
    message(FATAL_ERROR "Cannot build the SDK binding via CMake: We're relying on CocoaPods for this.")
endif()
