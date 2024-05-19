# TODO: Add find_package for the jsi headers and link it,
# only relevant on Android, since this is handled via our Podspec for Apple

# TODO: Assert that we're building for Android

find_package(ReactAndroid REQUIRED CONFIG)

set(Realm_DIR "${PROJECT_SOURCE_DIR}/../prebuilds/android/${ANDROID_ABI}/share/cmake/Realm")
find_package(Realm REQUIRED CONFIG)

add_library(realm-js-jsi OBJECT
    jsi_init.cpp
)

target_compile_definitions(realm-js-jsi
    PRIVATE REALM_ENABLE_SYNC=1 REALM_ANDROID=1
)

target_include_directories(realm-js-jsi
    PRIVATE ${JSI_HEADER_DIR} "${PROJECT_SOURCE_DIR}" "${PROJECT_SOURCE_DIR}/../bindgen/src" "${PROJECT_SOURCE_DIR}/../bindgen/vendor/realm-core/bindgen/src"
)

target_link_libraries(realm-js-jsi PUBLIC
    Realm::Storage
    Realm::QueryParser
    Realm::ObjectStore
    Realm::Sync
    ReactAndroid::jsi
)
