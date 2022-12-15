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
    ../../node_modules/react-native/ReactAndroid/src/main/jni/react/turbomodule/ReactCommon/CallInvokerHolder.cpp
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
if(NOT EXISTS ${REACT_NATIVE_AAR_DIR})
    set(REACT_ANDROID_LIB_URL "https://repo1.maven.org/maven2/com/facebook/react/react-android/0.71.0-rc.3/react-android-0.71.0-rc.3-release.aar")
    message(STATUS "Getting ${REACT_ANDROID_LIB_URL}")
    file(DOWNLOAD "${REACT_ANDROID_LIB_URL}" "${REACT_NATIVE_AAR_DIR}/react-android-0.71.0-rc.3-release.aar" STATUS download_status)

    list(GET download_status 0 status_code)
    if (NOT "${status_code}" STREQUAL "0")
        message(FATAL_ERROR "Downloading ${url}... Failed. Status: ${download_status}")
    endif()

    message(STATUS "Uncompressing ${REACT_NATIVE_AAR_DIR}/react-android-0.71.0-rc.3-release.aar")
    execute_process(
        COMMAND ${CMAKE_COMMAND} -E tar xfz "react-android-0.71.0-rc.3-release.aar"
        WORKING_DIRECTORY "${REACT_NATIVE_AAR_DIR}"
    )
endif()

# file(GLOB_RECURSE REACT_NATIVE_AAR_FILE ${REACT_NATIVE_ROOT_DIR}/android/*/react-native-*-release.aar)
# file(ARCHIVE_EXTRACT INPUT ${REACT_NATIVE_AAR_FILE} DESTINATION ${REACT_NATIVE_AAR_DIR})
set(REACT_NATIVE_SO_DIR "${REACT_NATIVE_AAR_DIR}/jni/${ANDROID_ABI}")

target_link_directories(realm-js-android PRIVATE ${REACT_NATIVE_SO_DIR})
target_include_directories(realm-js-android PRIVATE ${JSI_HEADER_DIR})

# FBJNI_ROOT_DIR allows sharing the same directory for all architectures and skip re-downloading
if(NOT FBJNI_ROOT_DIR)
    # set FBJNI_ROOT_DIR to current dir
    set(FBJNI_ROOT_DIR "${CMAKE_CURRENT_BINARY_DIR}")
endif()

set(FBJNI_LIB_DIR "${FBJNI_ROOT_DIR}/jni/${ANDROID_ABI}")
set(FBJNI_LIB_FILE "${JSC_LIB_DIR}/libfbjni.so")
set(FBJNI_INCLUDE_DIR "${FBJNI_ROOT_DIR}/prefab/modules/fbjni/include")

if(NOT EXISTS ${FBJNI_LIB_DIR})
    set(FBJNI_LIB_URL "https://repo1.maven.org/maven2/com/facebook/fbjni/fbjni/0.2.2/fbjni-0.2.2.aar")

    message(STATUS "Getting ${FBJNI_LIB_URL}...")
    file(DOWNLOAD "${FBJNI_LIB_URL}" "${FBJNI_ROOT_DIR}/fbjni-0.2.2.aar" STATUS download_status)

    list(GET download_status 0 status_code)
    if (NOT "${status_code}" STREQUAL "0")
        message(FATAL_ERROR "Downloading ${url}... Failed. Status: ${download_status}")
    endif()

    message(STATUS "Uncompressing ${FBJNI_ROOT_DIR}/fbjni-0.2.2.aar")
    execute_process(
        COMMAND ${CMAKE_COMMAND} -E tar xfz "fbjni-0.2.2.aar"
        WORKING_DIRECTORY "${FBJNI_ROOT_DIR}"
    )
endif()

if (ANDROID_ABI MATCHES "^armeabi")
    target_compile_definitions(realm-js-android PUBLIC REALM_WRAP_MEMMOVE=1)
    target_link_options(realm-js-android PUBLIC -Wl,--wrap=memmove -Wl,--wrap=memcpy)
else()
    target_compile_definitions(realm-js-android PUBLIC REALM_WRAP_MEMMOVE=0)
endif()

set(CMAKE_INTERPROCEDURAL_OPTIMIZATION OFF)
set(CMAKE_CXX_FLAGS_RELEASE "-DNDEBUG -Oz")

target_link_options(realm-js-android PUBLIC  -fvisibility=hidden)

if (CMAKE_BUILD_TYPE STREQUAL "Release")
    set(REALM_LINKER_FLAGS "${REALM_LINKER_FLAGS} -Wl,-gc-sections -Wl,--exclude-libs,ALL")
endif()
set(CMAKE_SHARED_LINKER_FLAGS "${CMAKE_SHARED_LINKER_FLAGS} ${REALM_LINKER_FLAGS}")

if(REALM_JS_BUILD_CORE_FROM_SOURCE AND TARGET ObjectStore)
    target_compile_definitions(ObjectStore PUBLIC
        REALM_PLATFORM=Android
        REALM_ANDROID=1
    )
endif()

# Setup fbjni library
find_library(FBJNI_LIBRARY fbjni PATHS ${FBJNI_LIB_DIR} NO_CMAKE_FIND_ROOT_PATH)
target_include_directories(realm-js-android PUBLIC
    ${FBJNI_INCLUDE_DIR}
    ../../node_modules/react-native/ReactAndroid/src/main/java/com/facebook/react/turbomodule/core/jni/
    ../../node_modules/react-native/ReactAndroid/src/main/jni/react/turbomodule/
    ../../node_modules/react-native/ReactCommon/callinvoker/
)

target_link_libraries(realm-js-android
    ${FBJNI_LIBRARY}
    realm-js-jsi
    realm-js-shared
    jsi
)

if (CMAKE_BUILD_TYPE STREQUAL "Release" OR CMAKE_BUILD_TYPE STREQUAL "MinSizeRel")
    add_custom_command(TARGET realm-js-android
        POST_BUILD
        COMMAND ${CMAKE_STRIP} $<TARGET_FILE:realm-js-android>)
endif()
