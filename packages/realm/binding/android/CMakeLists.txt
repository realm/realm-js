cmake_minimum_required(VERSION 3.18.1)
project(RealmJS)

# TODO: Add a target for the prebuilt .so of Realm Core + headers

add_library(realm-js-android-binding SHARED
    ../jsi/jsi_init.cpp
    src/main/cpp/hack.cpp
    src/main/cpp/platform.cpp
    src/main/cpp/jni_utils.cpp
    src/main/cpp/io_realm_react_RealmReactModule.cpp
)

set_target_properties(realm-js-android-binding PROPERTIES
    OUTPUT_NAME "realm"
    PREFIX "lib"
    SUFFIX ".so"
    LIBRARY_OUTPUT_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}/src/main/jniLibs/${ANDROID_ABI}"
)

if (ANDROID_ABI MATCHES "^armeabi")
    target_compile_definitions(realm-js-android-binding PUBLIC REALM_WRAP_MEMMOVE=1)
    target_link_options(realm-js-android-binding PUBLIC -Wl,--wrap=memmove -Wl,--wrap=memcpy)
else()
    target_compile_definitions(realm-js-android-binding PUBLIC REALM_WRAP_MEMMOVE=0)
endif()

set(CMAKE_INTERPROCEDURAL_OPTIMIZATION OFF)
set(CMAKE_CXX_FLAGS_RELEASE "-DNDEBUG -Oz")

target_link_options(realm-js-android-binding PUBLIC -fvisibility=hidden)

# TODO: Could this REACT_NATIVE_ROOT_DIR be passed from

target_include_directories(realm-js-android-binding PRIVATE
    "${REACT_NATIVE_ROOT_DIR}/ReactCommon/callinvoker"
    "${CMAKE_CURRENT_SOURCE_DIR}/.."
    "${CMAKE_CURRENT_SOURCE_DIR}/../../bindgen/src"
    "${CMAKE_CURRENT_SOURCE_DIR}/../../bindgen/vendor/realm-core/bindgen/src"
)

find_library(android-lib android)
find_library(log-lib log)

find_package(fbjni REQUIRED CONFIG)
find_package(ReactAndroid REQUIRED CONFIG)

set(Realm_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../../prebuilds/android/${ANDROID_ABI}/share/cmake/Realm")
find_package(Realm REQUIRED CONFIG)

target_link_libraries(realm-js-android-binding
    ${android-lib}
    ${log-lib}
    Realm::Storage
    Realm::QueryParser
    Realm::ObjectStore
    Realm::Sync
    ReactAndroid::jsi
    ReactAndroid::reactnativejni
    ReactAndroid::turbomodulejsijni
    fbjni::fbjni
)

if (CMAKE_BUILD_TYPE STREQUAL "Release" OR CMAKE_BUILD_TYPE STREQUAL "MinSizeRel")
    add_custom_command(TARGET realm-js-android-binding
        POST_BUILD
        COMMAND ${CMAKE_STRIP} $<TARGET_FILE:realm-js-android-binding>)
endif()
