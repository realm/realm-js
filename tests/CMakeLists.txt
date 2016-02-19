include_directories(../external/catch/single_include .)

set(HEADERS
    util/test_file.hpp
)

set(SOURCES
    index_set.cpp
    main.cpp
    parser.cpp
    results.cpp
    util/test_file.cpp
)

add_executable(tests ${SOURCES} ${HEADERS})
target_link_libraries(tests realm-object-store)

setup_target_for_coverage(generate-coverage tests coverage)

add_custom_target(run-tests USES_TERMINAL DEPENDS tests COMMAND ./tests)
