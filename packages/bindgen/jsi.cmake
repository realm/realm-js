# This file is based on src/node/CMakeLists.txt

# Using Node.js to resolve the path to the "react-native" package.
# This enables building for iOS on the end-users machine,
# where "react-native" is installed as a sibling to our package instead of being a dev-dependency of our package.

execute_process(
    COMMAND node --print "path.dirname(require.resolve('react-native/package.json'))"
    OUTPUT_VARIABLE REACT_NATIVE_ROOT_DIR
    OUTPUT_STRIP_TRAILING_WHITESPACE
    COMMAND_ERROR_IS_FATAL ANY
)
set(JSI_HEADER_DIR "${REACT_NATIVE_ROOT_DIR}/ReactCommon/jsi")
message(STATUS "Getting JSI headers from ${JSI_HEADER_DIR}")

target_include_directories(realm-js PRIVATE ${JSI_HEADER_DIR})
