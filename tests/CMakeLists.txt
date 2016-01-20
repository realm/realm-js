include_directories(../external/catch/single_include)
add_executable(tests main.cpp parser.cpp)
target_link_libraries(tests realm-object-store)

add_custom_target(run-tests USES_TERMINAL DEPENDS tests COMMAND ./tests)
