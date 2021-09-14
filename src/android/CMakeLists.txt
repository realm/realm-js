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

set(PACKAGE_ROOT_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../..")

# JSI_DIR allows sharing the same directory for all architectures and skip re-downloading
if(NOT JSI_DIR)
    # set JSI_DIR to current dir
    set(JSI_DIR "${CMAKE_CURRENT_BINARY_DIR}")
endif()

if(NOT REACT_NATIVE_DIR)
    message(FATAL_ERROR "Expected a REACT_NATIVE_DIR")
endif()

if(NOT REACT_NATIVE_VERSION)
    message(FATAL_ERROR "Expected a REACT_NATIVE_VERSION")
endif()

set(HERMES_LIB_DIR "${JSI_DIR}/jni/${ANDROID_ABI}")
set(HERMES_LIB_PATH "${HERMES_LIB_DIR}/libjsi.so")

set(REACT_NATIVE_AAR_DIR "${REACT_NATIVE_DIR}/android/com/facebook/react/react-native/${REACT_NATIVE_VERSION}")
set(REACT_NATIVE_AAR_FILE "react-native-${REACT_NATIVE_VERSION}.aar")

if(NOT EXISTS ${HERMES_LIB_PATH})
    message(STATUS "Copying ${REACT_NATIVE_AAR_DIR}/${REACT_NATIVE_AAR_FILE}")
    execute_process(
        COMMAND ${CMAKE_COMMAND} -E copy ${REACT_NATIVE_AAR_FILE} ${JSI_DIR}/${REACT_NATIVE_AAR_FILE}
        WORKING_DIRECTORY ${REACT_NATIVE_AAR_DIR}
    )
    message(STATUS "Uncompressing ${JSI_DIR}/${REACT_NATIVE_AAR_FILE}")
    execute_process(
        COMMAND ${CMAKE_COMMAND} -E tar xfz ${REACT_NATIVE_AAR_FILE}
        WORKING_DIRECTORY ${JSI_DIR}
    )
endif()

# set(REACT_NATIVE_DIR "${PACKAGE_ROOT_DIR}/node_modules/react-native")
# message(STATUS "Looking in ${REACT_NATIVE_DIR}/ReactAndroid/build/react-ndk/all/${ANDROID_ABI}")
# find_library(JSI jsi
#    PATHS ${REACT_NATIVE_DIR}/ReactAndroid/build/react-ndk/all/${ANDROID_ABI}
#    REQUIRED
#)

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