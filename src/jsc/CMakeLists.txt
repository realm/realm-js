add_library(realm-js-jsc OBJECT
    jsc_init.cpp
    jsc_value.cpp
    rpc.cpp
)

target_include_directories(realm-js-jsc PUBLIC ${CMAKE_CURRENT_SOURCE_DIR})    

target_link_libraries(realm-js-jsc PUBLIC realm-js-shared)
