cmake_minimum_required(VERSION 3.18.1)

set(REACT_NATIVE_ROOT_DIR "${PACKAGE_ROOT_DIR}/node_modules/react-native")
set(REACT_NATIVE_AAR_DIR "${CMAKE_BINARY_DIR}/../react-native-aar") # TODO: Could we use CMAKE_BINARY_DIR instead?

set(JSI_HEADER_DIR "${REACT_NATIVE_ROOT_DIR}/ReactCommon/jsi")

add_library(realm-js-android SHARED
    # $<TARGET_OBJECTS:realm-js-shared>
    hack.cpp
    platform.cpp
    jni_utils.cpp
    io_realm_react_RealmReactModule.cpp
)

set_target_properties(realm-js-android PROPERTIES 
    OUTPUT_NAME "realm"
    PREFIX "lib"
    SUFFIX ".so"
    LIBRARY_OUTPUT_DIRECTORY "${PACKAGE_ROOT_DIR}/react-native/android/src/main/jniLibs/${ANDROID_ABI}"
)

target_compile_definitions(realm-js-android PRIVATE
    REALM_HAVE_UV=0
    REALM_ANDROID=1
    REALM_HAVE_CONFIG=1
)

# Extract .so files from the React Native AAR
file(GLOB_RECURSE REACT_NATIVE_AAR_FILE ${REACT_NATIVE_ROOT_DIR}/android/*/react-native-*.aar)
file(ARCHIVE_EXTRACT INPUT ${REACT_NATIVE_AAR_FILE} DESTINATION ${REACT_NATIVE_AAR_DIR})
set(REACT_NATIVE_SO_DIR "${REACT_NATIVE_AAR_DIR}/jni/${ANDROID_ABI}")

target_link_directories(realm-js-android PRIVATE ${REACT_NATIVE_SO_DIR})
target_include_directories(realm-js-android PRIVATE ${JSI_HEADER_DIR})

if (ANDROID_ABI MATCHES "^armeabi")
    target_compile_definitions(realm-js-android PUBLIC REALM_WRAP_MEMMOVE=1)
    target_link_options(realm-js-android PUBLIC -Wl,--wrap=memmove -Wl,--wrap=memcpy)
else()
    target_compile_definitions(realm-js-android PUBLIC REALM_WRAP_MEMMOVE=0)
endif()

if(REALM_JS_BUILD_CORE_FROM_SOURCE AND TARGET ObjectStore)
    target_compile_definitions(ObjectStore PUBLIC
        REALM_PLATFORM=Android
        REALM_ANDROID=1
    )
endif()

target_link_libraries(realm-js-android PUBLIC
    realm-js-hermes
    realm-js-shared
    jsi
)

if (CMAKE_BUILD_TYPE STREQUAL "Release" OR CMAKE_BUILD_TYPE STREQUAL "MinSizeRel")
    add_custom_command(TARGET realm-js-android
        POST_BUILD
        COMMAND ${CMAKE_STRIP} $<TARGET_FILE:realm-js-android>)
endif()