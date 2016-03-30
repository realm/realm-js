{
  "targets": [
    {
      "target_name": "realm",
      "sources": [
        "src/js_realm.cpp",
        "src/node/node_init.cpp",
        "src/node/node_object_accessor.cpp",
        "src/object-store/src/index_set.cpp",
        "src/object-store/src/list.cpp",
        "src/object-store/src/object_schema.cpp",
        "src/object-store/src/object_store.cpp",
        "src/object-store/src/results.cpp",
        "src/object-store/src/schema.cpp",
        "src/object-store/src/shared_realm.cpp",
        "src/object-store/src/impl/async_query.cpp",
        "src/object-store/src/impl/transact_log_handler.cpp",
        "src/object-store/src/impl/realm_coordinator.cpp",
        "src/object-store/src/impl/apple/external_commit_helper.cpp",
        "src/object-store/src/impl/apple/weak_realm_notifier.cpp",
        "src/object-store/src/parser/parser.cpp",
        "src/object-store/src/parser/query_builder.cpp",
        "src/ios/platform.mm"
      ],
      "include_dirs": [
        "core/include",
        "node_modules/nan",
        "src",
        "src/object-store/src",
        "src/object-store/src/impl",
        "src/object-store/src/impl/apple",
        "src/object-store/src/parser",
        "src/object-store/external/pegtl"
      ],
      "cflags_cc": ["-DREALM_HAVE_CONFIG", "-fexceptions", "-frtti", "-std=c++14", "-g", "-O0"],
      "ldflags": ["-Lcore", "-lrealm"],
      "xcode_settings": {
        "OTHER_CFLAGS": ["-mmacosx-version-min=10.8", "-DREALM_HAVE_CONFIG", "-fexceptions", "-frtti", "-std=c++14", "-stdlib=libc++", "-g", "-O0", "-Wno-mismatched-tags"],
        "OTHER_LDFLAGS": ["-mmacosx-version-min=10.8", "-framework", "Foundation", "-Lcore", "-lrealm", "-std=c++14"]
      }
    }
  ]
}
