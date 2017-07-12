{
  "variables": {
    "use_realm_debug%": "<!(node -p \"'REALMJS_USE_DEBUG_CORE' in process.env ? 1 : 0\")"
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
        "debug_library_suffix": "-dbg"
      }
    }, {
      "variables": {
        "debug_library_suffix": ""
      }
    }]
  ],
  "targets": [
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
            "include_dirs": [ "<(prefix)/src" ],
          },
          "direct_dependent_settings": {
            "library_dirs": [ "<(prefix)/src/realm" ]
          }
        }, {
          "dependencies": [ "vendored-realm" ]
        }],
        ["OS=='win'", {
          "direct_dependent_settings": {
            "libraries": [ "-lsha_win32<(debug_library_suffix)" ]
          }
        }]
      ]
    },
    {
      "target_name": "realm-sync",
      "type": "none",
      "dependencies": [ "realm-core" ],
      "direct_dependent_settings": {
        "libraries": [ "-lrealm-sync-node<(debug_library_suffix)" ]
      },
      "all_dependent_settings": {
        "defines": [ "REALM_ENABLE_SYNC=1" ]
      },
      "export_dependent_settings": [ "realm-core" ], # depending on sync is tantamount to depending on core
      "variables": {
        "prefix": "<!(node -p \"process.env.REALM_SYNC_PREFIX || String()\")"
      },
      "conditions": [
        ["prefix!=''", {
          "all_dependent_settings+": {
            "include_dirs": [ "<(prefix)/src" ],
          },
          "direct_dependent_settings+": {
            "library_dirs": [ "<(prefix)/src/realm" ]
          }
        }, {
          "dependencies+": [ "vendored-realm" ]
        }]
      ],
    },
    {
      "variables": {
        "vendor_dir%": "<(module_root_dir)/vendor/realm-<(OS)-<(target_arch)<(debug_library_suffix)"
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
              "inputs": [ "<(module_root_dir)/scripts/download-realm.js" ],
              "outputs": [ "<(vendor_dir)" ],
              "action": [ "node", "<(module_root_dir)/scripts/download-realm.js", "<(OS)", ">(download_realm_debug_flag)", ">(download_realm_sync_flag)", "--arch=<(target_arch)" ]
            }
          ]
        }]
      ]
    }
  ]
}
