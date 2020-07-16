{
  "conditions": [
    ["OS=='linux'", {
      "variables": {
        "realm_download_binaries": "1"
      }
    }]
  ],
  "includes": [
    "target_defaults.gypi",
    "realm.gypi"
  ],
  "targets": [
    {
      "target_name": "realm",
      "conditions": [
        [ "OS!='mac'", {
          "dependencies": [ "object-store", "OpenSSL",  "<!(node -p \"require('node-addon-api').gyp\")"],
        }, {
          "dependencies": [ "object-store", "<!(node -p \"require('node-addon-api').gyp\")" ],
        }],
        ["realm_enable_sync", {
          "sources": [
            "src/js_sync_util.hpp",
            "src/js_sync.hpp",
            "src/js_app.hpp",
            "src/js_app_credentials.hpp",
            "src/js_user.hpp",
            "src/js_network_transport.hpp",
            "src/js_email_password_auth.hpp",
            "src/js_api_key_auth.hpp",
            "src/js_auth.hpp",
            "src/node/sync_logger.cpp",
            "src/node/sync_logger.hpp",
          ]
        }]
      ],
      "xcode_settings": {
        "OTHER_LDFLAGS": ["-framework Foundation", "-Wl,-exported_symbols_list /dev/null"],
      },
      "sources": [
        "src/js_realm.cpp",
        "src/node/node_init.cpp",
        "src/node/platform.cpp",
        "src/concurrent_deque.hpp",
        "src/js_class.hpp",
        "src/js_collection.hpp",
        "src/js_list.hpp",
        "src/js_object_accessor.hpp",
        "src/js_observable.hpp",
        "src/js_realm.hpp",
        "src/js_realm_object.hpp",
        "src/js_results.hpp",
        "src/js_schema.hpp",
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
        "src",
        "src/object-store/src",
        "src/object-store/external/json",
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
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

        "binding.gyp",
        "dependencies.list",
        "package.json",
        "realm.gypi",
        "target_defaults.gypi",

        "lib/collection-methods.js",
        "lib/errors.js",
        "lib/extensions.js",
        "lib/index.js",
        "lib/notifier.js",
        "lib/submit-analytics.js",

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
        "lib/browser/util.js",

        "scripts/build-node-pre-gyp.ps1",
        "scripts/ccache-clang++.sh",
        "scripts/ccache-clang.sh",
        "scripts/changelog-header.sh",
        "scripts/check-environment.js",
        "scripts/docker-android-wrapper.sh",
        "scripts/docker-wrapper.sh",
        "scripts/docker_build_wrapper.sh",
        "scripts/download-object-server.sh",
        "scripts/download-realm.js",
        "scripts/find-ios-device.rb",
        "scripts/find-ios-runtime.rb",
        "scripts/git-win-symlink-aliases",
        "scripts/handle-license-check.js",
        "scripts/nvm-wrapper.sh",
        "scripts/pack-with-pre-gyp.sh",
        "scripts/prepublish.js",
        "scripts/publish.sh",
        "scripts/react-tests-android.js",
        "scripts/set-version.sh",
        "scripts/test.sh",
        "scripts/utils.sh",

        "tests/.eslintrc.json",
        "tests/index.js",
        "tests/js/asserts.js",
        "tests/js/async-tests.js",
        "tests/js/download-api-helper.js",
        "tests/js/encryption-tests.js",
        "tests/js/garbage-collection.js",
        "tests/js/index.js",
        "tests/js/linkingobjects-tests.js",
        "tests/js/list-tests.js",
        "tests/js/migration-tests.js",
        "tests/js/object-id-tests.js",
        "tests/js/object-tests.js",
        "tests/js/package.json",
        "tests/js/query-tests.js",
        "tests/js/query-tests.json",
        "tests/js/realm-tests.js",
        "tests/js/results-tests.js",
        "tests/js/schemas.js",
        "tests/js/session-tests.js",
        "tests/js/user-tests.js",
        "tests/js/worker-tests-script.js",
        "tests/js/worker.js",
        "tests/package.json",
        "tests/spec/helpers/mock_realm.js",
        "tests/spec/helpers/reporters.js",
        "tests/spec/helpers/setup-module-path.js",
        "tests/spec/support/jasmine.json",
        "tests/spec/unit_tests.js",
        "tests/test-runners/ava/package.json",
        "tests/test-runners/ava/test.js",
        "tests/test-runners/jest/package.json",
        "tests/test-runners/jest/test.js",
        "tests/test-runners/mocha/package.json",
        "tests/test-runners/mocha/test.js",
      ]
    }
  ]
}
