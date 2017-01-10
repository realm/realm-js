{
  "variables": {
    "use_realm_debug": "<!(echo $REALMJS_USE_DEBUG_CORE)"
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
    }]
  ],
  "targets": [
    {
      "target_name": "realm-core",
      "type": "none",
      "direct_dependent_settings": {
        "conditions": [
          ["use_realm_debug!=''", {
            "libraries": [ "-lrealm-node-dbg" ],
            "defines": [ "REALM_DEBUG=1" ]
          }, {
            "libraries": [ "-lrealm-node" ]
          }]
        ]
      },
      "all_dependent_settings": {
        "defines": [ "REALM_HAVE_CONFIG", "REALM_PLATFORM_NODE=1", "REALM_ENABLE_SYNC=<(realm_enable_sync)" ]
      },
      "variables": {
        "prefix": "<!(echo $REALM_CORE_PREFIX)"
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
        }]
      ]
    },
    {
      "target_name": "realm-sync",
      "type": "none",
      "dependencies": [ "realm-core" ], # sync headers include core headers
      "direct_dependent_settings": {
        "conditions": [
          ["use_realm_debug!=''", {
            "libraries": [ "-lrealm-sync-node-dbg" ]
          }, {
            "libraries": [ "-lrealm-sync-node" ]
          }]
        ]
      },
      "export_dependent_settings": [ "realm-core" ], # depending on sync is tantamount to depending on core
      "variables": {
        "prefix": "<!(echo $REALM_SYNC_PREFIX)"
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
        }]
      ],
    },
    {
      "variables": {
        "vendor_dir%": "<(module_root_dir)/vendor",
      },
      "target_name": "vendored-realm",
      "type": "none",
      "conditions": [
        ["realm_enable_sync", {
          "all_dependent_settings": {
            "include_dirs": [ "<(module_root_dir)/vendor/node-sync/include" ],
            "library_dirs": [ "<(module_root_dir)/vendor/node-sync/osx" ]
          }
        }, {
          "all_dependent_settings": {
            "include_dirs": [ "<(module_root_dir)/vendor/core-node/include" ],
            "library_dirs": [ "<(module_root_dir)/vendor/core-node" ]
          },

        }],
        ["realm_download_binaries", {
          "actions": [
            {
              "action_name": "download-realm",
              "inputs": [ ],
              "outputs": [ "<(module_root_dir)/vendor/core-node" ],
              "action": [ "<(module_root_dir)/scripts/download-core.sh", "node", "<(realm_enable_sync)" ]
            }
          ]
        }]
      ]
    }
  ]
}
