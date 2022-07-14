add_library(realm-js-android SHARED
    # $<TARGET_OBJECTS:realm-js-shared>
    hack.cpp
    platform.cpp
    jni_utils.cpp
    io_realm_react_RealmReactModule.cpp
    jsc_override.cpp
    ../../node_modules/react-native/ReactAndroid/src/main/java/com/facebook/react/turbomodule/core/jni/ReactCommon/CallInvokerHolder.cpp
)

set_target_properties(realm-js-android PROPERTIES 
    OUTPUT_NAME "realm"
    PREFIX "lib" 
    SUFFIX ".so"
)

set_target_properties(realm-js-android
                      PROPERTIES
                      LIBRARY_OUTPUT_DIRECTORY "libs/${ANDROID_ABI}")

target_compile_definitions(realm-js-android PRIVATE
    REALM_HAVE_UV=0
    REALM_ANDROID=1
    REALM_HAVE_CONFIG=1
)

# JSC_ROOT_DIR allows sharing the same directory for all architectures and skip re-downloading
if(NOT JSC_ROOT_DIR)
    # set JSC_ROOT_DIR to current dir
    set(JSC_ROOT_DIR "${CMAKE_CURRENT_BINARY_DIR}")
endif()

set(JSC_LIB_DIR "${JSC_ROOT_DIR}/package/dist/org/webkit/android-jsc/r241213/jni/${ANDROID_ABI}")
set(JSC_LIB_FILE "${JSC_LIB_DIR}/libjsc.so")

if(NOT EXISTS ${JSC_LIB_FILE})
    set(JSC_LIB_URL "https://registry.npmjs.org/jsc-android/-/jsc-android-241213.1.0.tgz")

    message(STATUS "Getting ${JSC_LIB_URL}...")
    file(DOWNLOAD "${JSC_LIB_URL}" "${JSC_ROOT_DIR}/jsc-android-241213.1.0.tgz" STATUS download_status)

    list(GET download_status 0 status_code)
    if (NOT "${status_code}" STREQUAL "0")
        message(FATAL_ERROR "Downloading ${url}... Failed. Status: ${download_status}")
    endif()
    
    message(STATUS "Uncompressing ${JSC_ROOT_DIR}/jsc-android-241213.1.0.tgz")
    execute_process(
        COMMAND ${CMAKE_COMMAND} -E tar xfz "jsc-android-241213.1.0.tgz"
        WORKING_DIRECTORY "${JSC_ROOT_DIR}"
    )

    message(STATUS "Uncompressing ${JSC_ROOT_DIR}/package/dist/org/webkit/android-jsc/r241213/android-jsc-r241213.aar")
    execute_process(
        COMMAND ${CMAKE_COMMAND} -E tar xfz "android-jsc-r241213.aar"
        WORKING_DIRECTORY "${JSC_ROOT_DIR}/package/dist/org/webkit/android-jsc/r241213/"
    )
endif()

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

target_link_options(realm-js-android PUBLIC  -fvisibility=hidden)

if(REALM_JS_BUILD_CORE_FROM_SOURCE AND TARGET ObjectStore)
    target_compile_definitions(ObjectStore PUBLIC
        REALM_PLATFORM=Android
        REALM_ANDROID=1
    )
endif()

# Setup JSC library
target_include_directories(realm-js-jsc PUBLIC "../jsc/include")
target_include_directories(realm-js-android PUBLIC ${CMAKE_CURRENT_SOURCE_DIR})

target_link_directories(realm-js-android PUBLIC "${JSC_LIB_DIR}")
target_link_libraries(realm-js-android realm-js-jsc realm-js-shared "${JSC_LIB_FILE}")

# Setup fbjni library
find_library(FBJNI_LIBRARY fbjni PATHS ${FBJNI_LIB_DIR} NO_CMAKE_FIND_ROOT_PATH)
target_include_directories(realm-js-android PUBLIC 
    ${FBJNI_INCLUDE_DIR}
    ../../node_modules/react-native/ReactAndroid/src/main/java/com/facebook/react/turbomodule/core/jni/
    ../../node_modules/react-native/ReactCommon/callinvoker/
)

target_link_libraries(realm-js-android ${FBJNI_LIBRARY} realm-js-shared)

if (CMAKE_BUILD_TYPE STREQUAL "Release" OR CMAKE_BUILD_TYPE STREQUAL "MinSizeRel")
    add_custom_command(TARGET realm-js-android
        POST_BUILD
        COMMAND ${CMAKE_STRIP} $<TARGET_FILE:realm-js-android>)
endif()