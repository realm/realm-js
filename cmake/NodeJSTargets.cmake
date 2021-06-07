# Include N-API wrappers
execute_process(COMMAND node -p "require('node-addon-api').include"
        WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
        OUTPUT_VARIABLE NODE_ADDON_API_DIR
        OUTPUT_STRIP_TRAILING_WHITESPACE
)
string(REPLACE "\"" "" NODE_ADDON_API_DIR ${NODE_ADDON_API_DIR})

# Define an interface target with the cmake-js headers and libraries
add_library(NodeJS INTERFACE)
target_include_directories(NodeJS INTERFACE ${CMAKE_JS_INC} ${NODE_ADDON_API_DIR})
target_link_libraries(NodeJS INTERFACE ${CMAKE_JS_LIB})

# Node.js exports the zlib headers and symbols, so use those
# realm-core depends on the ZLIB::ZLIB target - if we don't define it ourselves it'll search globally for a zlib library
if(NOT WIN32)
  add_library(ZLIB::ZLIB ALIAS NodeJS)
endif()
