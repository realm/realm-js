{
  "includes": [
    "src/node/gyp/target_defaults.gypi",
    "src/node/gyp/realm.gyp"
  ],
  "targets": [
    {
      "variables": {
        "developer_edition%": "0"
      },
      "target_name": "realm",
      "dependencies": [
        "object-store"
      ],
      "sources": [
        "src/node/node_sync_logger.cpp",
        "src/node/node_init.cpp",
        "src/node/platform.cpp",
        "src/js_realm.cpp"
      ],
      "include_dirs": [
        "src"
      ],
      "defines": [ "REALM_DEVELOPER_EDITION=<(developer_edition)" ],
      "link_settings": {
        "ldflags": [
          "-Wl,--exclude-libs=ALL"
        ]
      },
      "xcode_settings": {
        "OTHER_LDFLAGS": [ "-Xlinker -unexported_symbol -Xlinker '*'" ]
      }
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
      "dependencies": [ "realm-sync" ], # sync also includes core
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
        "src/object-store/src/sync_manager.cpp",
        "src/object-store/src/sync_session.cpp",
        "src/object-store/src/thread_confined.cpp",
        "src/object-store/src/global_notifier.cpp",
        "src/object-store/src/impl/collection_change_builder.cpp",
        "src/object-store/src/impl/collection_notifier.cpp",
        "src/object-store/src/impl/handover.cpp",
        "src/object-store/src/impl/list_notifier.cpp",
        "src/object-store/src/impl/realm_coordinator.cpp",
        "src/object-store/src/impl/results_notifier.cpp",
        "src/object-store/src/impl/transact_log_handler.cpp",
        "src/object-store/src/impl/weak_realm_notifier.cpp",
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
    },
    {
      "target_name": "action_after_build",
      "type": "none",
      "dependencies": [ "<(module_name)" ],
      "copies": [
        {
          "files": [ "<(PRODUCT_DIR)/<(module_name).node" ],
          "destination": "<(module_path)"
        }
      ]
    }
  ]
}
