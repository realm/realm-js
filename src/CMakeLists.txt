set(LIBRARY_TYPE SHARED)
if(REALM_PLATFORM STREQUAL Apple)
  set(LIBRARY_TYPE STATIC)
endif()

add_library(realm-js ${LIBRARY_TYPE} js_realm.cpp)
target_link_libraries(realm-js realm-object-store realm-parser)
target_include_directories(realm-js PRIVATE ../vendor)

if(TARGET NodeJS)
  target_link_libraries(realm-js NodeJS)
  target_sources(realm-js PRIVATE
    node/platform.cpp
  )
  if(NOT REALM_JS_AUGMENT_NODE_ADDON)
    target_sources(realm-js PRIVATE node/node_init.cpp)
  endif()
  set_target_properties(realm-js PROPERTIES
    POSITION_INDEPENDENT_CODE ON
    OUTPUT_NAME realm
    PREFIX ""
    SUFFIX .node
  )
elseif(ReactNative)
  target_sources(realm-js PRIVATE
    jsc/jsc_init.cpp
    jsc/jsc_value.cpp
  )
  if(REALM_PLATFORM STREQUAL Android)
    target_sources(realm-js PRIVATE
      android/hack.cpp
      android/io_realm_react_ReactNativeModule.cpp
      android/jni_utils.cpp
      android/platform.cpp
    )
  elseif(REALM_PLATFORM STREQUAL Apple)
    target_sources(realm-js PRIVATE
      ios/platform.mm
    )
  endif()
endif()