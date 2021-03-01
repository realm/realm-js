{
  "variables": {
    "realm_enable_sync%": "1",
    "realm_download_binaries%": "1",
    "use_realm_debug%": "<!(node -p \"'REALMJS_USE_DEBUG_CORE' in process.env ? 1 : 0\")",
    "realm_js_dir%": "<(module_root_dir)",
    "runtime%": "node"
  },
  "conditions": [
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
      "target_name": "realm-core",
      "type": "none",
      "direct_dependent_settings": {
        "conditions": [
          ["use_realm_debug", {
            "defines": [ "REALM_DEBUG=1" ]
          }],
          ["realm_enable_sync", {
            "defines" : [ "REALM_ENABLE_SYNC=1"]
          }]
        ]
      },
      "link_settings": {
        "libraries": [ "-lrealm-parser-macosx<(debug_library_suffix)", "-lrealm-monorepo-macosx<(debug_library_suffix)" ],
      },
      "variables": {
        "prefix": "<!(node -p \"process.env.REALM_CORE_PREFIX || String()\")"
      },
      "conditions": [
        ["prefix!=''", {
          "all_dependent_settings": {
            "include_dirs": [ "<(prefix)/src", "<(prefix)/<(build_directory)/src" ],
          },
          "link_settings": {
            "library_dirs": [ "<(prefix)/<(build_directory)/src/realm" ]
          }
        }, {
          "dependencies": [ "vendored-realm" ]
        }]
      ]
    },
    {
      "target_name": "OpenSSL",
      "type": "none",
      "variables": {
        "vendor_dir": "<(realm_js_dir)/vendor/realm-<(OS)-<(target_arch)<(debug_library_suffix)"
      },
      "link_settings": {
        "conditions": [
          ["OS=='win'", {
            "conditions": [
              ["target_arch=='ia32'", {
                "library_dirs": [ "C:\\src\\vcpkg\\installed\\x86-windows-static\\lib" ]
              }, {
                "library_dirs": [ "C:\\src\\vcpkg\\installed\\x64-windows-static\\lib" ]
              }],
            ],
            # This inserts libssl.lib at the beginning of the linker input list,
            # causing it to be considered before node.lib and its OpenSSL symbols.
            # Additionally, we request that all the symbols from libssl.lib are included
            # in the final executable.
            "msvs_settings": {
              "VCLinkerTool": {
                "AdditionalDependencies": [ "libcrypto.lib", "libssl.lib" ],
                "AdditionalOptions": [
                  "/WHOLEARCHIVE:libssl.lib"
                ]
              }
            }
          }],
          ["OS=='linux' and target_arch!='arm'", {
            # Use embedded openssl on non-RPi linux. We assume that linux+arm is RPi for now.
            "libraries": [ "<(vendor_dir)/openssl/lib/libssl.a", "<(vendor_dir)/openssl/lib/libcrypto.a" ],
            "library_dirs": [ "<(vendor_dir)/openssl/lib" ],
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
        "include_dirs": [ "<(vendor_dir)/include", "<(vendor_dir)/include/realm" ],
        "library_dirs": [ "<(vendor_dir)" ],
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
