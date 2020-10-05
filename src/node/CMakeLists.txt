# Include N-API wrappers
execute_process(COMMAND node -p "require('node-addon-api').include"
        WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
        OUTPUT_VARIABLE NODE_ADDON_API_DIR
        OUTPUT_STRIP_TRAILING_WHITESPACE
)
string(REPLACE "\"" "" NODE_ADDON_API_DIR ${NODE_ADDON_API_DIR})

add_library(realm-js SHARED
    $<TARGET_OBJECTS:realm-js-shared>
    ${CMAKE_JS_SRC}
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
)

target_include_directories(realm-js PRIVATE
    ${CMAKE_JS_INC}
    ${NODE_ADDON_API_DIR}
)

if(REALM_JS_BUILD_CORE_FROM_SOURCE AND TARGET ObjectStore)
    # we need to tell ObjectStore to use the libuv provided by Node.js
    target_include_directories(ObjectStore PUBLIC
        ${CMAKE_JS_INC}
    )
    target_compile_definitions(ObjectStore PUBLIC
        REALM_HAVE_UV=1
    )
endif()

target_link_libraries(realm-js ${CMAKE_JS_LIB} realm-js-shared)