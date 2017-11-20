{
  "variables": {
    "realm_download_binaries%": "1",
    "use_realm_debug%": "<!(node -p \"'REALMJS_USE_DEBUG_CORE' in process.env ? 1 : 0\")",
    "realm_js_dir%": "<(module_root_dir)",
    "runtime%": "node"
  },
  "conditions": [
    ["OS=='mac'", {
      "variables": {
        "realm_enable_sync%": "1"
      }
    }, {
      "variables": {
        "realm_enable_sync%": "0"
      }
    }],
    ["use_realm_debug", {
      "variables": {
        "debug_library_suffix": "-dbg",
        "build_directory": "build.debug",
      }
    }, {
      "variables": {
        "debug_library_suffix": "",
        "build_directory": "build.release",
      }
    }]
  ],
  "targets": [
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
        "src/object-store/src/util/uuid.cpp",
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
    },
    {
      "target_name": "realm-core",
      "type": "none",
      "direct_dependent_settings": {
        "libraries": [ "-lrealm<(debug_library_suffix)" ],
        "conditions": [
          ["use_realm_debug", {
            "defines": [ "REALM_DEBUG=1" ]
          }]
        ]
      },
      "variables": {
        "prefix": "<!(node -p \"process.env.REALM_CORE_PREFIX || String()\")"
      },
      "conditions": [
        ["prefix!=''", {
          "all_dependent_settings": {
            "include_dirs": [ "<(prefix)/src", "<(prefix)/<(build_directory)/src" ],
          },
          "direct_dependent_settings": {
            "library_dirs": [ "<(prefix)/<(build_directory)/src/realm" ]
          }
        }, {
          "dependencies": [ "vendored-realm" ]
        }],
        ["runtime=='electron'", {
          "dependencies": [ "OpenSSL" ]
        }]
      ]
    },
    {
      "target_name": "realm-sync",
      "type": "none",
      "dependencies": [ "realm-core" ],
      "direct_dependent_settings": {
        "conditions": [
          ["OS=='win'", {
            "libraries": [ "-lrealm-sync<(debug_library_suffix)" ]
          }, {
            "libraries": [ "-lrealm-sync-node<(debug_library_suffix)" ]
          }]
        ]
      },
      "all_dependent_settings": {
        "defines": [ "REALM_ENABLE_SYNC=1" ]
      },
      "export_dependent_settings": [ "<@(_dependencies)" ], # depending on sync is tantamount to depending on core
      "variables": {
        "prefix": "<!(node -p \"process.env.REALM_SYNC_PREFIX || String()\")"
      },
      "conditions": [
        ["prefix!=''", {
          "all_dependent_settings": {
            "include_dirs": [ "<(prefix)/src" ],
          },
          "direct_dependent_settings": {
            "library_dirs": [ "<(prefix)/src/realm" ]
          }
        }, {
          "dependencies": [ "vendored-realm" ]
        }],
        ["runtime=='electron'", {
          "dependencies": [ "OpenSSL" ]
        }]
      ],
    },
    {
      "target_name": "OpenSSL",
      "type": "none",
      "direct_dependent_settings": {
        "conditions": [
          ["OS=='win'", {
            "libraries": [ "libeay32.lib", "ssleay32.lib" ],
            "conditions": [
              ["target_arch=='ia32'", {
                "library_dirs": [ "C:\\src\\vcpkg\\installed\\x86-windows-static\\lib" ]
              }, {
                "library_dirs": [ "C:\\src\\vcpkg\\installed\\x64-windows-static\\lib" ]
              }],
            ]
          }],
          ["OS=='linux'", {
            "libraries": [ "-l:libssl.a", "-l:libcrypto.a" ]
          }]
        ]
      }
    },
    {
      "variables": {
        "vendor_dir": "<(realm_js_dir)/vendor/realm-<(OS)-<(target_arch)<(debug_library_suffix)"
      },
      "target_name": "vendored-realm",
      "type": "none",
      "all_dependent_settings": {
        "include_dirs": [ "<(vendor_dir)/include" ],
        "library_dirs": [ 
          "<(vendor_dir)/lib",
          "<(vendor_dir)/osx"
        ]
      },
      "conditions": [
        ["use_realm_debug", {
          "variables": { "download_realm_debug_flag": "--debug" }
        }, {
          "variables": { "download_realm_debug_flag": "" }
        }],
        ["realm_enable_sync", {
          "variables": { "download_realm_sync_flag": "--sync" }
        }, {
          "variables": { "download_realm_sync_flag": "" }
        }],
        ["realm_download_binaries", {
          "actions": [
            {
              "action_name": "download-realm",
              "inputs": [ "<(realm_js_dir)/scripts/download-realm.js" ],
              "outputs": [ "<(vendor_dir)" ],
              "action": [ "node", "<(realm_js_dir)/scripts/download-realm.js", "<(OS)", ">(download_realm_debug_flag)", ">(download_realm_sync_flag)", "--arch=<(target_arch)" ]
            }
          ]
        }]
      ]
    }
  ]
}
