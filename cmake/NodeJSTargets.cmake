# Define an interface target with the cmake-js headers and libraries
add_library(NodeJS INTERFACE)
target_include_directories(NodeJS INTERFACE ${CMAKE_JS_INC})
target_link_libraries(NodeJS INTERFACE ${CMAKE_JS_LIB})

# Node.js exports the zlib headers and symbols, so use those
# realm-core depends on the ZLIB::ZLIB target - if we don't define it ourselves it'll search globally for a zlib library
if(NOT WIN32)
  add_library(ZLIB::ZLIB ALIAS NodeJS)
endif()
