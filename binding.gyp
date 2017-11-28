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
        "src/js_realm.cpp",
        "src/node/node_init.cpp",
        "src/node/platform.cpp",

        "src/concurrent_deque.hpp",
        "src/event_loop_dispatcher.hpp",
        "src/js_class.hpp",
        "src/js_collection.hpp",
        "src/js_list.hpp",
        "src/js_object_accessor.hpp",
        "src/js_observable.hpp",
        "src/js_realm.hpp",
        "src/js_realm_object.hpp",
        "src/js_results.hpp",
        "src/js_schema.hpp",
        "src/js_sync.hpp",
        "src/js_types.hpp",
        "src/js_util.hpp",
        "src/node/node_class.hpp",
        "src/node/node_context.hpp",
        "src/node/node_exception.hpp",
        "src/node/node_function.hpp",
        "src/node/node_init.hpp",
        "src/node/node_object.hpp",
        "src/node/node_protected.hpp",
        "src/node/node_return_value.hpp",
        "src/node/node_string.hpp",
        "src/node/node_types.hpp",
        "src/node/node_value.hpp",
        "src/platform.hpp",
        "src/rpc.hpp",
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
    },
    {
      "target_name": "scripts",
      "type": "none",
      "sources": [
        "CHANGELOG.md",
        "README.md",
        "binding.gyp",
        "dependencies.list",
        "package.json",
        "realm.gypi",
        "target_defaults.gypi",

        "lib/collection-methods.js",
        "lib/errors.js",
        "lib/extensions.js",
        "lib/index.d.ts",
        "lib/index.js",
        "lib/management-schema.js",
        "lib/permission-api.js",
        "lib/submit-analytics.js",
        "lib/user-methods.js",

        "lib/browser/base64.js",
        "lib/browser/collections.js",
        "lib/browser/constants.js",
        "lib/browser/index.js",
        "lib/browser/lists.js",
        "lib/browser/objects.js",
        "lib/browser/results.js",
        "lib/browser/rpc.js",
        "lib/browser/session.js",
        "lib/browser/user.js",
        "lib/browser/util.js"

        "scripts/build-node-pre-gyp.ps1",
        "scripts/build-node-pre-gyp.sh",
        "scripts/ccache-clang++.sh",
        "scripts/ccache-clang.sh",
        "scripts/changelog-header.sh",
        "scripts/check-environment.js",
        "scripts/docker-android-wrapper.sh",
        "scripts/docker-wrapper.sh",
        "scripts/docker_build_wrapper.sh",
        "scripts/download-object-server.sh",
        "scripts/download-realm.js",
        "scripts/download_and_start_server.sh",
        "scripts/find-ios-device.rb",
        "scripts/git-win-symlink-aliases",
        "scripts/handle-license-check.js",
        "scripts/prepublish.js",
        "scripts/publish.sh",
        "scripts/react-tests-android.js",
        "scripts/set-version.sh",
        "scripts/test.sh",
      ]
    }
  ]
}
