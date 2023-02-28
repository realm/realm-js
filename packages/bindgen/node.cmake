# This file is based on src/node/CMakeLists.txt

if(DEFINED CMAKE_JS_VERSION)
    list(APPEND CMAKE_MODULE_PATH "${CMAKE_SOURCE_DIR}/../../cmake")
    include(NodeJSTargets)
endif()

add_library(realm-js-node SHARED)

set_target_properties(realm-js-node PROPERTIES
    OUTPUT_NAME "realm"
    PREFIX ""
    SUFFIX ".node"
)

set_target_properties(realm-js-node PROPERTIES
    # Need a dummy generator expression to avoid adding in the config name
    LIBRARY_OUTPUT_DIRECTORY "${TYPESCRIPT_OUTPUT_DIR}/$<0:dummy_genex>"
    RUNTIME_OUTPUT_DIRECTORY "${TYPESCRIPT_OUTPUT_DIR}/$<0:dummy_genex>"
)

if(WIN32)
    set_source_files_properties(node_init.cpp PROPERTIES
        # see https://docs.microsoft.com/en-us/cpp/build/reference/bigobj-increase-number-of-sections-in-dot-obj-file?view=msvc-160#remarks
        COMPILE_FLAGS "/bigobj"
    )

    find_package(OpenSSL REQUIRED)
    target_link_libraries(realm-js-node OpenSSL::SSL)
    target_link_options(realm-js-node PRIVATE "/WHOLEARCHIVE:libssl.lib")
    target_compile_definitions(realm-js PRIVATE WIN32_LEAN_AND_MEAN)
endif()

target_compile_definitions(realm-js PRIVATE
    REALM_HAVE_UV=1
    REALM_PLATFORM_NODE=1
    NAPI_VERSION=6
)

if(REALM_JS_BUILD_CORE_FROM_SOURCE AND TARGET ObjectStore)
    # we need to tell ObjectStore to use the libuv provided by Node.js
    target_link_libraries(ObjectStore PUBLIC NodeJS)
    target_compile_definitions(ObjectStore PUBLIC
        REALM_HAVE_UV=1
        REALM_PLATFORM_NODE=1
    )
endif()

target_link_libraries(realm-js-node
    NodeJS
    realm-js
)
