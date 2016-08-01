{
  "targets": [
    {
      "target_name": "download-realm",
      "type": "none",
      "all_dependent_settings": {
        "include_dirs": [ "<(module_root_dir)/core-node/include" ],
        "library_dirs": [ "<(module_root_dir)/core-node" ]
      },
      "actions": [
        {
          "action_name": "download-core",
          "inputs": [ ],
          "outputs": [ "<(module_root_dir)/core-node" ],
          "action": [ "<(module_root_dir)/scripts/download-core.sh", "node" ]
        }
      ] 
    }
  ]
}