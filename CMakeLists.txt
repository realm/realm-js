include(CheckCXXCompilerFlag)

# compiling for Node.js, need to set up toolchains before project() call
if(DEFINED CMAKE_JS_VERSION)
    if(CMAKE_HOST_SYSTEM_NAME STREQUAL "Windows")
        set(CMAKE_SYSTEM_VERSION 8.1)
        if(CMAKE_GENERATOR_PLATFORM MATCHES "^[Ww][Ii][Nn]32$")
            set(VCPKG_TARGET_TRIPLET "x86-windows-static" CACHE STRING "")
        elseif(CMAKE_GENERATOR_PLATFORM MATCHES "^[Xx]64$")
            set(VCPKG_TARGET_TRIPLET "x64-windows-static" CACHE STRING "")
        endif()
        if(DEFINED ENV{VCPKG_ROOT})
            set(CMAKE_TOOLCHAIN_FILE "$ENV{VCPKG_ROOT}/scripts/buildsystems/vcpkg.cmake")
        else()
            set(CMAKE_TOOLCHAIN_FILE "C:\\src\\vcpkg\\scripts\\buildsystems\\vcpkg.cmake")
        endif()
    elseif(APPLE)
        set(CMAKE_TOOLCHAIN_FILE "${CMAKE_CURRENT_LIST_DIR}/vendor/realm-core/tools/cmake/macosx.toolchain.cmake")
        if(DEFINED ENV{NODE_ARCH_ARM})
            set(CMAKE_OSX_ARCHITECTURES "arm64" CACHE STRING "")
        else()
            set(CMAKE_OSX_ARCHITECTURES "x86_64" CACHE STRING "")
        endif()
    elseif(CMAKE_HOST_SYSTEM_NAME STREQUAL "Linux")
        add_link_options(-fuse-ld=gold)
        add_link_options(-Wl,-z,noexecstack)
	    add_link_options(-Wl,--warn-execstack)
    endif()
endif()

cmake_minimum_required(VERSION 3.15)
project(RealmJS)

# Use ccache if available
find_program(CCACHE_PROGRAM ccache)
if(CCACHE_PROGRAM)
    set_property(GLOBAL PROPERTY RULE_LAUNCH_COMPILE "${CCACHE_PROGRAM}")
endif()

# Copied from Realm Core's CMakeList.txt
function(add_cxx_flag_if_supported flag)
    if(flag MATCHES "^-Wno-")
        # Compilers ignore unknown -Wno-foo flags, so look for -Wfoo instead.
        string(REPLACE "-Wno-" "-W" check_flag ${flag})
    else()
        set(check_flag ${flag})
    endif()

    check_cxx_compiler_flag(${check_flag} HAVE${check_flag})
    if(HAVE${check_flag})
        add_compile_options($<$<COMPILE_LANGUAGE:CXX>:${flag}>)
    endif()
endfunction()

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

set(CMAKE_CXX_VISIBILITY_PRESET hidden)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)
set(CMAKE_MSVC_RUNTIME_LIBRARY "MultiThreaded$<$<CONFIG:Debug>:Debug>")

list(APPEND CMAKE_MODULE_PATH "${CMAKE_SOURCE_DIR}/cmake")

if(DEFINED CMAKE_JS_VERSION)
    include(NodeJSTargets)
endif()

if (NOT MSVC)
    # Ninja buffers output so we need to tell the compiler to use colors even though stdout isn't a tty.
    if(CMAKE_GENERATOR STREQUAL "Ninja")
        add_cxx_flag_if_supported(-fdiagnostics-color)
    endif()
endif()

option(REALM_JS_BUILD_CORE_FROM_SOURCE "Build Realm Core from source, as opposed to downloading prebuilt binaries" ON)
if(REALM_JS_BUILD_CORE_FROM_SOURCE)
    set(REALM_BUILD_LIB_ONLY ON)
    set(REALM_ENABLE_SYNC ON)

    if(ANDROID)
        set(REALM_ANDROID ON)
    endif()

    add_subdirectory(vendor/realm-core EXCLUDE_FROM_ALL)
endif()

add_subdirectory(src)
