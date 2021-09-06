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
)

set_target_properties(realm-js-android
                      PROPERTIES
                      LIBRARY_OUTPUT_DIRECTORY "libs/${ANDROID_ABI}")

target_compile_definitions(realm-js-android PRIVATE
    REALM_HAVE_UV=0
    REALM_ANDROID=1
    REALM_HAVE_CONFIG=1
)

# HERMES_ROOT_DIR allows sharing the same directory for all architectures and skip re-downloading
if(NOT HERMES_ROOT_DIR)
    # set HERMES_ROOT_DIR to current dir
    set(HERMES_ROOT_DIR "${CMAKE_CURRENT_BINARY_DIR}")
endif()

set(HERMES_LIB_DIR "${HERMES_ROOT_DIR}/package/android/jni/${ANDROID_ABI}")
set(HERMES_LIB_FILE "${HERMES_LIB_DIR}/libhermes.so")

if(NOT EXISTS ${HERMES_LIB_FILE})
    set(HERMES_LIB_URL "https://registry.npmjs.org/hermes-engine/-/hermes-engine-0.8.0.tgz")

    message(STATUS "Getting ${HERMES_LIB_URL}...")
    file(DOWNLOAD "${HERMES_LIB_URL}" "${HERMES_ROOT_DIR}/hermes-engine-0.8.0.tgz" STATUS download_status)

    list(GET download_status 0 status_code)
    if (NOT "${status_code}" STREQUAL "0")
        message(FATAL_ERROR "Downloading ${url}... Failed. Status: ${download_status}")
    endif()
    
    message(STATUS "Uncompressing ${HERMES_ROOT_DIR}/hermes-engine-0.8.0.tgz")
    execute_process(
        COMMAND ${CMAKE_COMMAND} -E tar xfz "hermes-engine-0.8.0.tgz"
        WORKING_DIRECTORY "${HERMES_ROOT_DIR}"
    )

    message(STATUS "Uncompressing ${HERMES_ROOT_DIR}/package/android/hermes-debug.aar")
    execute_process(
        COMMAND ${CMAKE_COMMAND} -E tar xfz "hermes-debug.aar"
        WORKING_DIRECTORY "${HERMES_ROOT_DIR}/package/android/"
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

target_include_directories(realm-js-hermes PUBLIC "../hermes")
target_include_directories(realm-js-android PUBLIC ${CMAKE_CURRENT_SOURCE_DIR})

target_link_directories(realm-js-android PUBLIC "${HERMES_LIB_DIR}")

target_link_libraries(realm-js-android realm-js-hermes realm-js-shared "${HERMES_LIB_FILE}")
target_link_libraries(realm-js-android realm-js-hermes realm-js-shared)

if (CMAKE_BUILD_TYPE STREQUAL "Release" OR CMAKE_BUILD_TYPE STREQUAL "MinSizeRel")
    add_custom_command(TARGET realm-js-android
        POST_BUILD
        COMMAND ${CMAKE_STRIP} $<TARGET_FILE:realm-js-android>)
endif()