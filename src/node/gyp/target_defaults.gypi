{
  "target_defaults": {
    "variables": {
      "warning-flags": [
        "-Wno-missing-field-initializers",
        "-Wno-return-type",
        "-Wno-unused-result",
        "-Wno-deprecated-declarations",
        "-Wundef"
      ]
    },
    "cflags_cc!": [ # turn off default flags on older nodes on linux
      "-fno-exceptions",
      "-fno-rtti",
      "-std=gnu++0x"
    ],
    "cflags_cc": [
      "-fexceptions",
      "-frtti",
      "-std=c++14",
      "<@(warning-flags)"
    ],
    "include_dirs": [
      "<!(node -e \"require('nan')\")"
    ],
    "conditions": [
      ["OS=='mac'", {
        "xcode_settings": {
          "CLANG_CXX_LANGUAGE_STANDARD": "c++14",
          "CLANG_CXX_LIBRARY": "libc++",
          "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
          "GCC_ENABLE_CPP_RTTI": "YES",
          "MACOSX_DEPLOYMENT_TARGET": "10.8",
          "OTHER_LDFLAGS": ["-framework Foundation"],
          "WARNING_CFLAGS": [ "<@(warning-flags)" ]
        }
      }]
    ]
  }
}