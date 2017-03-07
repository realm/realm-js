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
    ["OS=='win'", {
      "conditions": [
        ["target_arch == 'ia32'", {
          "variables": {
            "realm_library_suffix": "-x86"
          }
        }, {
          "variables": {
            "realm_library_suffix": "-<(target_arch)"
          }
        }]
      ]
    }, {
      "variables": {
        "realm_library_suffix": "-node"
      }
    }]
  ],
  "targets": [
    {
      "target_name": "realm-core",
      "type": "none",
      "direct_dependent_settings": {
        "conditions": [
          ["use_realm_debug", {
            "defines": [ "REALM_DEBUG=1" ],
            "libraries": [ "-lrealm<(realm_library_suffix)-dbg" ]
          }, {
            "libraries": [ "-lrealm<(realm_library_suffix)" ]
          }]
        ]
      },
      "all_dependent_settings": {
        "defines": [ "REALM_PLATFORM_NODE=1", "REALM_ENABLE_SYNC=<(realm_enable_sync)" ]
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
          "all_dependent_settings": {
            "defines": [ "PTW32_STATIC_LIB" ]
          }
        }, {
          "all_dependent_settings": {
            "defines": [ "REALM_HAVE_CONFIG" ]
          }
        }]
      ]
    },
    {
      "target_name": "realm-sync",
      "type": "none",
      "dependencies": [ "realm-core" ], # sync headers include core headers
      "direct_dependent_settings": {
        "conditions": [
          ["use_realm_debug", {
            "libraries": [ "-lrealm-sync<(realm_library_suffix)-dbg" ]
          }, {
            "libraries": [ "-lrealm-sync<(realm_library_suffix)" ]
          }]
        ]
      },
      "export_dependent_settings": [ "realm-core" ], # depending on sync is tantamount to depending on core
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
        }]
      ],
    },
    {
      "variables": {
        "vendor_dir%": "<(module_root_dir)/vendor"
      },
      "target_name": "vendored-realm",
      "type": "none",
      "all_dependent_settings": {
        "include_dirs": [ "<(module_root_dir)/vendor/realm-node/include" ],
        "library_dirs": [ 
          "<(module_root_dir)/vendor/realm-node/",
          "<(module_root_dir)/vendor/realm-node/lib",
          "<(module_root_dir)/vendor/realm-node/osx"
        ]
      },
      "conditions": [
        ["realm_download_binaries and OS=='win'", {
          "actions": [
            {
              "action_name": "download-realm",
              "inputs": [ "<(module_root_dir)/scripts/download-realm.js" ],
              "outputs": [ "<(module_root_dir)/vendor/realm-node" ],
              "action": [ "node", "<(module_root_dir)/scripts/download-realm.js", "node", "<(use_realm_debug)" ]
            }
          ]
        }],
        ["realm_download_binaries and OS!='win'", {
          "actions": [
            {
              "action_name": "download-realm",
              "inputs": [ ],
              "outputs": [ "<(module_root_dir)/vendor/realm-node" ],
              "action": [ "<(module_root_dir)/scripts/download-core.sh", "node", "<(realm_enable_sync)" ]
            }
          ]
        }]
      ]
    }
  ]
}
