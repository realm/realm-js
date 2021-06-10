add_library(realm-js-hermes OBJECT
    hermes_init.cpp
)

target_include_directories(realm-js-hermes PUBLIC ${CMAKE_CURRENT_SOURCE_DIR})    

target_link_libraries(realm-js-hermes PUBLIC realm-js-shared)
