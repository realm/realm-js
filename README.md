# Realm Object Store

Cross-platform code used across bindings. Bindings may use some or all of the included functionality:
- `object_store`/`schema`/`object_schema`/`property` - contains the structures and logic used to setup and modify realm files and their schema.
- `shared_realm` - wraps the `object_store` APIs to provide transactions, notifications, realm caching, migrations, and other higher level functionality.
- `object_accessor`/`results`/`list` - accessor classes, object creation/update pipeline, and helpers for creating platform specific property getters and setters.
- `parser`/`query_builder` - cross platform query parser and query builder - requires and object_accessor specialization for argument support. Depends on https://github.com/ColinH/PEGTL

## Supported Platforms

The object store's CMake build system currently only suports building for OS X and Linux. Building for Linux requires
[building against a local version of core](#building-against-a-local-version-of-core).

The object store code supports being built for all Apple platforms, Linux and Android when integrated into a binding and using the binding's build system.

## Building

1. Download dependencies:
    ```
    git submodule update --init
    ```

2. Install CMake. You can download an installer for OS X from the [CMake download page](https://cmake.org/download/), or install via [Homebrew](http://brew.sh):
    ```
    brew install cmake
    ```

3. Generate build files:

    ```
    cmake .
    ```

4. Build:

    ```
    make
    ```

### Building Against a Local Version of Core

If you wish to build against a local version of core you can invoke `cmake` like so:

```
cmake -DREALM_CORE_VERSION=/path/to/realm-core
```

The given core tree will be built as part of the object store build.

### Building with Sanitizers

The object store can be built using ASan, TSan and/or UBSan by specifying `-DSANITIZE_ADDRESS=1`, `-DSANITIZE_THREAD=1`, or `-DSANITIZE_UNDEFINED=1` when invoking CMake.
Building with ASan requires specifying a path to core with `-DREAM_CORE_VERSION` as core needs to also be built with ASan enabled.

On OS X, the Xcode-provided copy of Clang only comes with ASan, and using TSan or UBSan requires a custom build of Clang.
If you have installed Clang as an external Xcode toolchain (using the `install-xcode-toolchain` when building LLVM), note that you'll have to specify `-DCMAKE_C_COMPILER=clang -DCMAKE_CXX_COMPILER=clang++` when running `cmake` to stop cmake from being too clever.

## Testing

```
make run-tests
```
