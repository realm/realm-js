cmake_minimum_required(VERSION 3.18.1)
project(RealmJS)

# Use ccache if available
find_program(CCACHE_PROGRAM ccache)
if(CCACHE_PROGRAM)
    set_property(GLOBAL PROPERTY RULE_LAUNCH_COMPILE "${CCACHE_PROGRAM}")
endif()

if(NOT REACT_NATIVE_ROOT_DIR)
    message(FATAL_ERROR "Expected REACT_NATIVE_ROOT_DIR to be defined")
endif()

add_library(realm-js-android-binding SHARED
    ../jsi/CxxRealmModule.cpp
    ../jsi/jsi_init.cpp
    ../jsi/react_scheduler.cpp
    src/main/cpp/platform.cpp
    src/main/cpp/jni_utils.cpp
    src/main/cpp/io_realm_react_RealmReactPackage.cpp
)

set_target_properties(realm-js-android-binding PROPERTIES
    OUTPUT_NAME "realm"
    PREFIX "lib"
    SUFFIX ".so"
    LIBRARY_OUTPUT_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}/src/main/jniLibs/${ANDROID_ABI}"
)

set(CMAKE_INTERPROCEDURAL_OPTIMIZATION OFF)
set(CMAKE_CXX_FLAGS_RELEASE "-DNDEBUG -Oz")
set(CMAKE_SHARED_LINKER_FLAGS "${CMAKE_SHARED_LINKER_FLAGS} -Wl,-z,max-page-size=16384")

# target_link_options(realm-js-android-binding PUBLIC -fvisibility=hidden)

target_include_directories(realm-js-android-binding PRIVATE
    "${CMAKE_CURRENT_SOURCE_DIR}/.."
    "${CMAKE_CURRENT_SOURCE_DIR}/../../binding/jsi"
    "${CMAKE_CURRENT_SOURCE_DIR}/../../bindgen/src"
    "${CMAKE_CURRENT_SOURCE_DIR}/../../bindgen/vendor/realm-core/bindgen/src"

    # We're relying on the private CallInvoker API to flush the micro-task queue as a workaround
    # See https://github.com/realm/realm-js/pull/4389 for context on this.
    # TODO: Submit an issue to make this public or the need for it obsolete.
    "${REACT_NATIVE_ROOT_DIR}/ReactCommon/callinvoker"
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
    ReactAndroid::jsi
    fbjni::fbjni
)

# This if-then-else can be removed once this library does not support version below 0.76
# Ideally we would just depend on `REACTNATIVE_MERGED_SO`
# See https://github.com/react-native-community/discussions-and-proposals/discussions/816
# For some reason (yet to be determined) we don't have REACTNATIVE_MERGED_SO set here.
# See https://github.com/react-native-community/discussions-and-proposals/discussions/816#discussioncomment-10659654
if (REACTNATIVE_MERGED_SO OR ReactAndroid_VERSION_MINOR GREATER_EQUAL 76)
    target_link_libraries(realm-js-android-binding
        ReactAndroid::reactnative
    )
else()
    target_link_libraries(realm-js-android-binding
        ReactAndroid::reactnativejni
        ReactAndroid::turbomodulejsijni
    )
endif()

if (CMAKE_BUILD_TYPE STREQUAL "Release" OR CMAKE_BUILD_TYPE STREQUAL "MinSizeRel")
    add_custom_command(TARGET realm-js-android-binding
        POST_BUILD
        COMMAND ${CMAKE_STRIP} $<TARGET_FILE:realm-js-android-binding>)
endif()
