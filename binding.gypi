{
  "includes": [
    "target_defaults.gypi",
    "realm.gypi"
  ],
  "targets": [
    {
      "target_name": "realm-js",
      "dependencies": [
        "vendored-realm", "object-store"
      ],
      "sources": [
        "src/node/platform.cpp",
        "src/js_realm.cpp"
      ],
      "include_dirs": [
        "src"
      ],
      "type": "static_library",
      "export_dependent_settings": [ "object-store" ]
    },
    {
      "target_name": "object-store",
      "dependencies": [ "realm-core" ],
      "type": "static_library",
      "include_dirs": [
        "src/object-store/src",
        "src/object-store/external/pegtl"
      ],
      "defines": [ "REALM_PLATFORM_NODE=1" ],
      "sources": [
        "src/object-store/src/binding_callback_thread_observer.cpp",
        "src/object-store/src/collection_notifications.cpp",
        "src/object-store/src/index_set.cpp",
        "src/object-store/src/list.cpp",
        "src/object-store/src/object.cpp",
        "src/object-store/src/placeholder.cpp",
        "src/object-store/src/object_schema.cpp",
        "src/object-store/src/object_store.cpp",
        "src/object-store/src/results.cpp",
        "src/object-store/src/schema.cpp",
        "src/object-store/src/shared_realm.cpp",
        "src/object-store/src/thread_safe_reference.cpp",
        "src/object-store/src/impl/collection_change_builder.cpp",
        "src/object-store/src/impl/collection_notifier.cpp",
        "src/object-store/src/impl/list_notifier.cpp",
        "src/object-store/src/impl/object_notifier.cpp",
        "src/object-store/src/impl/primitive_list_notifier.cpp",
        "src/object-store/src/impl/realm_coordinator.cpp",
        "src/object-store/src/impl/results_notifier.cpp",
        "src/object-store/src/impl/transact_log_handler.cpp",
        "src/object-store/src/impl/weak_realm_notifier.cpp",
        "src/object-store/src/parser/parser.cpp",
        "src/object-store/src/parser/query_builder.cpp",
        "src/object-store/src/util/format.cpp",
        "src/object-store/src/util/uuid.cpp"
      ],
      "conditions": [
        ["OS=='win'", {
          "sources": [
            "src/object-store/src/impl/windows/external_commit_helper.cpp",
          ]
        }],
        ["OS=='linux'", {
          "sources": [
            "src/object-store/src/impl/epoll/external_commit_helper.cpp",
          ]
        }],
        ["OS=='mac'", {
          "sources": [
            "src/object-store/src/impl/apple/external_commit_helper.cpp",
            "src/object-store/src/impl/apple/keychain_helper.cpp",
            "src/object-store/src/sync/impl/apple/network_reachability_observer.cpp",
            "src/object-store/src/sync/impl/apple/system_configuration.cpp"
          ]
        }],
        ["realm_enable_sync", {
          "dependencies": [ "realm-sync" ],
          "sources": [
            "src/object-store/src/sync/partial_sync.cpp",
            "src/object-store/src/sync/sync_config.cpp",
            "src/object-store/src/sync/sync_manager.cpp",
            "src/object-store/src/sync/sync_user.cpp",
            "src/object-store/src/sync/sync_session.cpp",
            "src/object-store/src/sync/sync_config.cpp",
            "src/object-store/src/sync/impl/sync_file.cpp",
            "src/object-store/src/sync/impl/sync_metadata.cpp"
          ],
        }]
      ],
      "all_dependent_settings": {
        "defines": [ "REALM_PLATFORM_NODE=1" ],
        "include_dirs": [
          "src/object-store/src",
          "src/object-store/src/impl",
          "src/object-store/src/impl/apple",
          "src/object-store/src/parser",
          "src/object-store/external/pegtl"
        ]
      },
      "export_dependent_settings": [
        "<@(_dependencies)" # re-export settings related to linking the realm binaries
      ]
    }
  ]
}