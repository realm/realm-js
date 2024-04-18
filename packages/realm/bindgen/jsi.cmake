# This file is based on src/node/CMakeLists.txt

# Using Node.js to resolve the path to the "react-native" package.
# This enables building for iOS on the end-users machine,
# where "react-native" is installed as a sibling to our package instead of being a dev-dependency of our package.

if(NOT DEFINED NODE_PATH)
    set(NODE_PATH $ENV{NODE_PATH})
    if(NOT NODE_PATH)
        find_program(NODE_PATH node)
    endif()
    # if node is still not defined after the above attempts, then stop everything
    if(NOT DEFINED NODE_PATH)
        message(FATAL_ERROR "Node.js not found")
    endif()
endif()

execute_process(
    COMMAND ${NODE_PATH} --print "path.dirname(require.resolve('react-native/package.json'))"
    OUTPUT_VARIABLE REACT_NATIVE_ROOT_DIR
    OUTPUT_STRIP_TRAILING_WHITESPACE
    COMMAND_ERROR_IS_FATAL ANY
)
set(JSI_HEADER_DIR "${REACT_NATIVE_ROOT_DIR}/ReactCommon/jsi")
message(STATUS "Getting JSI headers from ${JSI_HEADER_DIR}")

target_include_directories(realm-js PRIVATE ${JSI_HEADER_DIR})
