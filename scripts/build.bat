cmake.exe ^
    -GNinja ^
    -DANDROID_NDK=%ANDROID_NDK% ^
    -DANDROID_ABI=x86 ^
    -DCMAKE_MAKE_PROGRAM=ninja ^
    -DCMAKE_TOOLCHAIN_FILE=%ANDROID_NDK%/build/cmake/android.toolchain.cmake ^
    -DANDROID_TOOLCHAIN=clang ^
    -DANDROID_NATIVE_API_LEVEL=16 ^
    -DCMAKE_BUILD_TYPE=MinSizeRel ^
    -DANDROID_ALLOW_UNDEFINED_SYMBOLS=1 ^
    -DANDROID_STL=c++_static ^
    ..\

cmake --build .

