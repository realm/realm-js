{
 "includes": [
    "target_defaults.gypi",
    "realm.gypi"
  ],
  "targets": [
    {
      "target_name": "realm",
      "dependencies": [
        "object-store"
      ],
      "sources": [
        "src/node/platform.cpp",
        "src/js_realm.cpp",
        "src/node/node_init.cpp"
      ],
      "include_dirs": [
        "src"
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
