{
  "variables": {
    "use_realm_debug": "<!(echo $REALMJS_USE_DEBUG_CORE)",
  },
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
        "defines": [ "REALM_HAVE_CONFIG", "REALM_PLATFORM_NODE=1" ]
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
          "dependencies": [ "download-realm.gyp:download-realm" ]
        }]
      ]
    }
  ]
}