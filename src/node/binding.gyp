{
  "targets": [
    {
      "target_name": "realm",
      "sources": [
        "node_init.cpp",
        "platform.cpp",
        "../js_realm.cpp",
        "../object-store/src/collection_notifications.cpp",
        "../object-store/src/index_set.cpp",
        "../object-store/src/list.cpp",
        "../object-store/src/object_schema.cpp",
        "../object-store/src/object_store.cpp",
        "../object-store/src/results.cpp",
        "../object-store/src/schema.cpp",
        "../object-store/src/shared_realm.cpp",
        "../object-store/src/impl/collection_change_builder.cpp",
        "../object-store/src/impl/collection_notifier.cpp",
        "../object-store/src/impl/list_notifier.cpp",
        "../object-store/src/impl/realm_coordinator.cpp",
        "../object-store/src/impl/results_notifier.cpp",
        "../object-store/src/impl/transact_log_handler.cpp",
        "../object-store/src/impl/node/weak_realm_notifier.cpp",
        "../object-store/src/parser/parser.cpp",
        "../object-store/src/parser/query_builder.cpp",
        "../object-store/src/util/format.cpp",
        "../object-store/src/util/thread_id.cpp"
      ],
      "include_dirs": [
        "..",
        "../object-store/src",
        "../object-store/src/impl",
        "../object-store/src/impl/apple",
        "../object-store/src/parser",
        "../object-store/external/pegtl",
        "../../core-node/include",
        "../../node_modules/nan"
      ],
      "library_dirs": [
        "$(srcdir)/../../core-node"
      ],
      "defines": [
        "REALM_HAVE_CONFIG",
        "REALM_PLATFORM_NODE=1"
      ],
      "cflags_cc": [
        "-fexceptions",
        "-frtti",
        "-std=c++14",
        "-Wno-missing-field-initializers",
        "-Wno-return-type"
      ],
      "libraries": ["-lrealm-node"],
      "xcode_settings": {
        "CLANG_CXX_LANGUAGE_STANDARD": "c++14",
        "CLANG_CXX_LIBRARY": "libc++",
        "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
        "GCC_ENABLE_CPP_RTTI": "YES",
        "MACOSX_DEPLOYMENT_TARGET": "10.8",
        "OTHER_LDFLAGS": ["-framework", "Foundation"]
      },
      "conditions": [
        [
          "OS=='linux'", {
            "sources": [
              "../object-store/src/impl/android/external_commit_helper.cpp",
            ]
          }
        ],
        ["OS=='mac'", {
          "sources": [
            "../object-store/src/impl/apple/external_commit_helper.cpp"
          ]
        }]
      ],
      "configurations": {
        "Debug": {
          "defines": ["DEBUG=1"]
        }
      }
    }
  ]
}
