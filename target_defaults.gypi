{
  "target_defaults": {
    "variables": {
      "warning-flags": [
        "-Wno-missing-field-initializers",
        "-Wno-return-type",
        "-Wno-unused-result",
        "-Wno-deprecated-declarations"
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
      ["OS=='win'", {
        "defines": [ "_UNICODE", "UNICODE", "WIN32=1", "_HAS_EXCEPTIONS=1", "WIN32_LEAN_AND_MEAN", "_WIN32_WINNT=0x600" ]
      }],
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
    ],
    # windows stuff
    "configurations": {
      "Debug": {
        "msvs_settings": {
          "VCCLCompilerTool": {
            "RuntimeTypeInfo": "true",
          },
        }
      },
      "Release": {
        "msvs_settings": {
          "VCCLCompilerTool": {
            "RuntimeTypeInfo": "true",
          },
        }
      }
    },
    "msvs_settings": {
      "VCCLCompilerTool": {
        "ExceptionHandling": 1
      }
    },
    "msvs_disabled_warnings": [ 4068, 4101, 4244, 4996 ],
    "msbuild_toolset": "v141"
  }
}
