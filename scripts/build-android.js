////////////////////////////////////////////////////////////////////////////
//
// Copyright 2016 Realm Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
////////////////////////////////////////////////////////////////////////////

'use strict';
const fs = require('fs');
const { arch } = require('os');
const path = require('path');
const exec = require('child_process').execFileSync;

//simple validation of current directory.
const rnDir = path.resolve(process.cwd(), "react-native");
if (!fs.existsSync(rnDir)) {
    throw new Error("This script needs to be run at the root dir of the project");
}

let architectures = ["x86", "armeabi-v7a", "arm64-v8a", "x86_64"];
const copyOutputPath = path.resolve(process.cwd(), "react-native", "android", "build", "libs");

const optionDefinitions = [
    { name: 'arch', type: String, multiple: false, description: "Build only for a single architecture" },
    { name: 'changes', type: Boolean, defaultValue: false, multiple: false, description: "Build changes only" },
];
const options = require('command-line-args')(optionDefinitions);
if (options.arch) {
    if (!architectures.includes(options.arch)) {
        throw new Error(`"Invalid architecture. Supported architectures ${architectures}`);
    }
    architectures = [options.arch];
}

if (!"ANDROID_NDK" in process.env) {
    throw Error("ANDROID_NDK environment variable not set");
}
const ndkPath = process.env["ANDROID_NDK"];

const sdkPath = getAndroidSdkPath();
const cmakePath = getCmakePath(sdkPath);

const buildPath = path.resolve(process.cwd(), 'build-realm-android');
if (!options.changes) {
    if (fs.existsSync(buildPath)) {
        fs.rmdirSync(buildPath, { recursive: true });
    }
    fs.mkdirSync(buildPath);
}

//shared root dir to download jsc once for all architectures
const jscDir = path.resolve(buildPath, "jsc-android");

for (const arch of architectures) {
    console.log(`\nBuilding Realm JS Android for ${arch}`);
    console.log("=======================================");
    //create a build dir per architecture
    const archBuildDir = path.resolve(buildPath, arch);
    if (!fs.existsSync(archBuildDir)) {
        fs.mkdirSync(archBuildDir);
    }

    let args = [
        cmakePath,
        "-GNinja",
        `-DANDROID_NDK=${ndkPath}`,
        `-DANDROID_ABI=${arch}`,
        // `-DCMAKE_MAKE_PROGRAM=${sdkPath}/cmake/3.10.2.4988404/bin/ninja`,
        `-DCMAKE_TOOLCHAIN_FILE=${ndkPath}/build/cmake/android.toolchain.cmake`,
        "-DANDROID_TOOLCHAIN=clang",
        "-DANDROID_NATIVE_API_LEVEL=16",
        "-DCMAKE_BUILD_TYPE=MinSizeRel",
        // "-DANDROID_ALLOW_UNDEFINED_SYMBOLS=0",
        "-DANDROID_STL=c++_static",
        `-DJSC_ROOT_DIR=${jscDir}`,
        path.resolve(process.cwd())
    ];
    exec(cmakePath, args, { cwd: archBuildDir, stdio: 'inherit' });

    //cwd is the archBuildDir here, hence build the current dir with "--build ."
    args = ["--build", "."];
    exec(cmakePath, args, { cwd: archBuildDir, stdio: 'inherit' });

    copyOutput(arch, archBuildDir);
}

function copyOutput(arch, buildDir) {
    const outFile = path.resolve(buildDir, "src", "android", "libs", arch, "librealm.so");
    if (!fs.existsSync(outFile)) {
        throw new Error(`Build output file not found: ${outFile}`);
    }

    const archDir = path.resolve(copyOutputPath, arch);
    if (!fs.existsSync(archDir)) {
        fs.mkdirSync(archDir, { recursive: true });
    }

    const targetFile = path.resolve(archDir, "librealm.so");
    console.log(`Copying build file \n${outFile} to \n${targetFile}`);
    fs.copyFileSync(outFile, targetFile);
}

function getAndroidSdkPath() {
    if ("ANDROID_SDK" in process.env) {
        console.log("Using ANDROID_SDK env variable");
        return process.env["ANDROID_SDK"];
    }

    if ("ANDROID_HOME" in process.env) {
        console.log("Using ANDROID_HOME env variable");
        return process.env["ANDROID_HOME"];
    }

    if ("ANDROID_SDK_ROOT" in process.env) {
        console.log("Using ANDROID_SDK_ROOT env variable");
        return process.env["ANDROID_SDK_ROOT"];
    }

    throw new Error("Android SDK not found. ANDROID_SDK or ANDROID_HOME or ANDROID_SDK_ROOT needs to be set");
}

function getCmakePath(sdkPath) {
    if ("CMAKE_PATH" in process.env) {
        console.log("Using cmake from CMAKE_PATH environment variable");
        return process.env["CMAKE_PATH"];
    }

    const executableName = process.platform === 'win32' ? 'cmake.exe' : 'cmake';
    return executableName;
}