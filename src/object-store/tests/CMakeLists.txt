include_directories(../external/catch/single_include)

set(SOURCES
    index_set.cpp
    main.cpp
    parser.cpp)

add_executable(tests ${SOURCES})
target_link_libraries(tests realm-object-store)

add_custom_target(run-tests USES_TERMINAL DEPENDS tests COMMAND ./tests)
