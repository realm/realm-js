set(REACT_NATIVE_ROOT_DIR "${PACKAGE_ROOT_DIR}/node_modules/react-native")
set(JSI_HEADER_DIR "${REACT_NATIVE_ROOT_DIR}/ReactCommon/jsi")

add_library(realm-js-hermes OBJECT
    jsi_init.cpp
)

target_include_directories(realm-js-hermes PRIVATE ${JSI_HEADER_DIR})

target_link_libraries(realm-js-hermes PUBLIC realm-js-shared)
