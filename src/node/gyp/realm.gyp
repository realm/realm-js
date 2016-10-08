{
  "targets": [
    {
      "target_name": "realm-core",
      "type": "none",
      "all_dependent_settings": {
        "defines": [ "REALM_HAVE_CONFIG", "REALM_PLATFORM_NODE=1", "REALM_ENABLE_SYNC" ]
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
        }]
      ]
    },
    {
      "target_name": "realm-sync",
      "type": "none",
      "dependencies": [ "realm-core" ], # sync headers include core headers
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
        }]
      ],
    }
  ]
}
