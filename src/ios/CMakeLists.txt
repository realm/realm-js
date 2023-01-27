add_library(realm-js-ios STATIC
    platform.mm
)

target_link_libraries(realm-js-ios
    realm-js
)

# target_link_libraries(realm-js-jsc PUBLIC "-framework JavaScriptCore")
# target_link_libraries(realm-js-ios realm-js-jsc realm-js-shared)
# target_link_libraries(realm-js-ios realm-js-jsi realm-js-shared)
