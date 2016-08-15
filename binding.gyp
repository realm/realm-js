{
  "includes": [
    "src/node/gyp/target_defaults.gypi"
  ],
  "targets": [
    {
      "target_name": "realm",
      "dependencies": [
        "object-store"
      ],
      "sources": [
        "src/node/node_init.cpp",
        "src/node/platform.cpp",
        "src/js_realm.cpp"
      ],
      "include_dirs": [
        "src"
      ]
    },
    {
      "variables": {
        "object-store-include-dirs": [
          "src/object-store/src",
          "src/object-store/src/impl",
          "src/object-store/src/impl/apple",
          "src/object-store/src/parser",
          "src/object-store/external/pegtl"
        ]
      },
      "target_name": "object-store",
      "dependencies": [ "src/node/gyp/realm.gyp:realm-core" ],
      "type": "static_library",
      "include_dirs": [ "<@(object-store-include-dirs)" ],
      "sources": [
        "src/object-store/src/collection_notifications.cpp",
        "src/object-store/src/index_set.cpp",
        "src/object-store/src/list.cpp",
        "src/object-store/src/object_schema.cpp",
        "src/object-store/src/object_store.cpp",
        "src/object-store/src/results.cpp",
        "src/object-store/src/schema.cpp",
        "src/object-store/src/shared_realm.cpp",
        "src/object-store/src/impl/collection_change_builder.cpp",
        "src/object-store/src/impl/collection_notifier.cpp",
        "src/object-store/src/impl/list_notifier.cpp",
        "src/object-store/src/impl/realm_coordinator.cpp",
        "src/object-store/src/impl/results_notifier.cpp",
        "src/object-store/src/impl/transact_log_handler.cpp",
        "src/object-store/src/impl/node/weak_realm_notifier.cpp",
        "src/object-store/src/parser/parser.cpp",
        "src/object-store/src/parser/query_builder.cpp",
        "src/object-store/src/util/format.cpp",
        "src/object-store/src/util/thread_id.cpp"
      ],
      "conditions": [
        ["OS=='linux'", {
          "sources": [
            "src/object-store/src/impl/android/external_commit_helper.cpp",
          ]
        }],
        ["OS=='mac'", {
          "sources": [
            "src/object-store/src/impl/apple/external_commit_helper.cpp"
          ]
        }]
      ],
      "all_dependent_settings": {
        "include_dirs": [ "<@(object-store-include-dirs)" ]
      },
      "export_dependent_settings": [
        "<@(_dependencies)" # re-export settings related to linking the realm binaries
      ]
    }
  ]
}