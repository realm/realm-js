cmake_minimum_required(VERSION 3.18.1)

# TODO: Add a target for the prebuilt .so of Realm Core + headers
# TODO: Investigate if the prebuilt .so could be merged into the "realm-js-android-binding" target to take advantage of link-time optimizations

add_library(realm-js-android-binding SHARED
    hack.cpp
    platform.cpp
    jni_utils.cpp
    io_realm_react_RealmReactModule.cpp
)

set_target_properties(realm-js-android-binding PROPERTIES
    OUTPUT_NAME "realm"
    PREFIX "lib"
    SUFFIX ".so"
    LIBRARY_OUTPUT_DIRECTORY "${PROJECT_SOURCE_DIR}/../react-native/android/src/main/jniLibs/${ANDROID_ABI}"
)

# target_compile_definitions(realm-js-android-binding PRIVATE
#     REALM_HAVE_UV=0
#     REALM_ANDROID=1
#     REALM_HAVE_CONFIG=1
# )

if (ANDROID_ABI MATCHES "^armeabi")
    target_compile_definitions(realm-js-android-binding PUBLIC REALM_WRAP_MEMMOVE=1)
    target_link_options(realm-js-android-binding PUBLIC -Wl,--wrap=memmove -Wl,--wrap=memcpy)
else()
    target_compile_definitions(realm-js-android-binding PUBLIC REALM_WRAP_MEMMOVE=0)
endif()

set(CMAKE_INTERPROCEDURAL_OPTIMIZATION OFF)
set(CMAKE_CXX_FLAGS_RELEASE "-DNDEBUG -Oz")

target_link_options(realm-js-android-binding PUBLIC -fvisibility=hidden)

# if (CMAKE_BUILD_TYPE STREQUAL "Release")
#     set(REALM_LINKER_FLAGS "${REALM_LINKER_FLAGS} -Wl,-gc-sections -Wl,--exclude-libs,ALL")
# endif()

# set(CMAKE_SHARED_LINKER_FLAGS "${CMAKE_SHARED_LINKER_FLAGS} ${REALM_LINKER_FLAGS}")

# if(REALM_JS_BUILD_CORE_FROM_SOURCE AND TARGET ObjectStore)
#     target_compile_definitions(ObjectStore PUBLIC
#         REALM_PLATFORM=Android
#         REALM_ANDROID=1
#         REALM_ANDROID_ABI=${ANDROID_ABI}
#     )
# endif()

# TODO: Could this REACT_NATIVE_ROOT_DIR be passed from 

target_include_directories(realm-js-android-binding PRIVATE
    # "${PROJECT_SOURCE_DIR}/../react-native/android/include"
    "${REACT_NATIVE_ROOT_DIR}/ReactCommon/callinvoker"
)

find_library(android-lib android)
find_library(log-lib log)

find_package(fbjni REQUIRED CONFIG)
find_package(ReactAndroid REQUIRED CONFIG)

# target_link_directories(realm-js-android-binding
#     PRIVATE "${PROJECT_SOURCE_DIR}/../react-native/android/libs/${ANDROID_ABI}"
# )

target_link_libraries(realm-js-android-binding
    realm-js-jsi
    ${android-lib}
    ${log-lib}
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
