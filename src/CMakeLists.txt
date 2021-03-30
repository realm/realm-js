add_library(realm-js-shared OBJECT
    js_realm.cpp
)

target_link_libraries(realm-js-shared PUBLIC Realm::ObjectStore)
target_include_directories(realm-js-shared PUBLIC ${CMAKE_CURRENT_SOURCE_DIR})

if(DEFINED CMAKE_JS_VERSION)
    add_subdirectory(node)
elseif(ANDROID)
    add_subdirectory(jsc)
    add_subdirectory(android)
elseif(CMAKE_SYSTEM_NAME STREQUAL iOS)
    add_subdirectory(jsc)
    add_subdirectory(ios)
endif()