{
  "includes": [
    "binding.gypi"
  ],
  "targets": [
    {
      "target_name": "realm",
      "dependencies": [ "realm-js" ],
      "include_dirs": [
        "src"
      ],
      "sources": [
        "src/node/node_init.cpp"
      ]
    },
    {
      "target_name": "action_after_build",
      "type": "none",
      "dependencies": [ "realm" ],
      "copies": [
        {
          "files": [ "<(PRODUCT_DIR)/realm.node" ],
          "destination": "<(module_path)"
        }
      ]
    }
  ]
}
