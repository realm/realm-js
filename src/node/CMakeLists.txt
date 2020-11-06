

add_library(realm-js SHARED
    $<TARGET_OBJECTS:realm-js-shared>
    node_init.cpp
    platform.cpp
    sync_logger.cpp
)

set_target_properties(realm-js PROPERTIES 
    OUTPUT_NAME "realm"
    PREFIX "" 
    SUFFIX ".node"
)

target_compile_definitions(realm-js PRIVATE
    REALM_HAVE_UV=1
    REALM_PLATFORM_NODE
)

if(REALM_JS_BUILD_CORE_FROM_SOURCE AND TARGET ObjectStore)
    # we need to tell ObjectStore to use the libuv provided by Node.js
    target_link_libraries(ObjectStore PUBLIC NodeJS)
    target_compile_definitions(ObjectStore PUBLIC
        REALM_HAVE_UV=1
    )
endif()

target_link_libraries(realm-js NodeJS realm-js-shared)