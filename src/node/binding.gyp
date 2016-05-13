{
  "targets": [
    {
      "target_name": "realm",
      "sources": [
        "node_init.cpp",
        "platform.cpp",
        "../js_realm.cpp",
        "../object-store/src/index_set.cpp",
        "../object-store/src/list.cpp",
        "../object-store/src/object_schema.cpp",
        "../object-store/src/object_store.cpp",
        "../object-store/src/results.cpp",
        "../object-store/src/schema.cpp",
        "../object-store/src/shared_realm.cpp",
        "../object-store/src/impl/async_query.cpp",
        "../object-store/src/impl/transact_log_handler.cpp",
        "../object-store/src/impl/realm_coordinator.cpp",
        "../object-store/src/impl/apple/external_commit_helper.cpp",
        "../object-store/src/impl/apple/weak_realm_notifier.cpp",
        "../object-store/src/parser/parser.cpp",
        "../object-store/src/parser/query_builder.cpp"
      ],
      "include_dirs": [
        "..",
        "../object-store/src",
        "../object-store/src/impl",
        "../object-store/src/impl/apple",
        "../object-store/src/parser",
        "../object-store/external/pegtl",
        "../../core/include",
        "../../node_modules/nan"
      ],
      "library_dirs": [
        "$(srcdir)/../../core"
      ],
      "defines": [
        "REALM_HAVE_CONFIG",
        "REALM_PLATFORM_NODE=1"
      ],
      "cflags_cc": ["-fexceptions", "-frtti", "-std=c++14"],
      "libraries": ["-lrealm"],
      "xcode_settings": {
        "CLANG_CXX_LANGUAGE_STANDARD": "c++14",
        "CLANG_CXX_LIBRARY": "libc++",
        "MACOSX_DEPLOYMENT_TARGET": "10.8",
        "OTHER_CPLUSPLUSFLAGS": ["-fexceptions", "-frtti"],
        "OTHER_LDFLAGS": ["-framework", "Foundation"]
      },
      "configurations": {
        "Debug": {
          "defines": ["DEBUG=1"]
        }
      }
    }
  ]
}
