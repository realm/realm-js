////////////////////////////////////////////////////////////////////////////
//
// Copyright 2021 Realm Inc.
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

const copyOutputPath = path.resolve(process.cwd(), "react-native", "android", "src", "main", "jniLibs");

const buildTypes = ["Debug", "Release", "RelWithDebInfo", "MinSizeRel"];
let architectures = ["x86", "armeabi-v7a", "arm64-v8a", "x86_64"];
const optionDefinitions = [
    { name: 'arch', type: validateArchitectures, multiple: false, description: "Build only for a single architecture" },
    { name: 'changes', type: Boolean, defaultValue: false, multiple: false, description: "Build changes only" },
    { name: 'buildType', type: validateBuildType, defaultValue: "Release", multiple: false, description: "CMAKE_BUILD_TYPE: Debug, Release, RelWithDebInfo, MinSizeRel" },
];
const options = require('command-line-args')(optionDefinitions);

if (options.arch) {
    architectures = [options.arch];
}

if (!"ANDROID_NDK" in process.env) {
    throw Error("ANDROID_NDK environment variable not set");
}
const ndkPath = process.env["ANDROID_NDK"];

const sdkPath = getAndroidSdkPath();
const cmakePath = getCmakePath(sdkPath);
const cmakeVersion = getCmakeVersion(sdkPath);

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
        `-DCMAKE_MAKE_PROGRAM=${sdkPath}/cmake/${cmakeVersion}/bin/ninja`,
        `-DCMAKE_TOOLCHAIN_FILE=${ndkPath}/build/cmake/android.toolchain.cmake`,
        "-DANDROID_TOOLCHAIN=clang",
        "-DANDROID_NATIVE_API_LEVEL=16",
        `-DCMAKE_BUILD_TYPE=${options.buildType}`,
        "-DANDROID_STL=c++_static",
        `-DJSC_ROOT_DIR=${jscDir}`,
        process.cwd()
    ];
    exec(cmakePath, args, { cwd: archBuildDir, stdio: 'inherit' });

    //cwd is the archBuildDir here, hence build the current dir with "--build ."
    args = ["--build", "."];
    exec(cmakePath, args, { cwd: archBuildDir, stdio: 'inherit' });

    copyOutput(arch, archBuildDir);
}

generateVersionFile();

function generateVersionFile() {
    const targetFile = path.resolve(process.cwd(), "react-native", "android", "src", "main", "java", "io", "realm", "react", "Version.java");
    const version = getVersion();
    const versionFileContents = `package io.realm.react;

public class Version {
    public static final String VERSION = "${version}";
}
`;

    fs.writeFileSync(targetFile, versionFileContents);
}

function getVersion() {
    const depencenciesListFile = path.resolve(process.cwd(), "dependencies.list");
    const contents = fs.readFileSync(depencenciesListFile, "UTF-8");
    const lines = contents.split(/\r?\n/);
    const versionValue = lines.find(line => line.startsWith("VERSION="));
    if (!versionValue) {
        throw new Error("Realm version not found. Invalid dependencies.list file");
    }

    const version = versionValue.split("=")[1];
    if (!version) {
        throw new Error("Realm version not found. Invalid version value in dependencies.list file");
    }

    return version;
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

    return process.platform === 'win32' ? 'cmake.exe' : 'cmake';
}

function getCmakeVersion(sdkPath) {
    let dirs = fs.readdirSync(`${sdkPath}/cmake`);
    if (dirs.length === 0) {
        throw new Error(`No CMake installation found in ${sdkPath}/cmake`);
    }
    return dirs.sort()[dirs.length - 1];
}

function validateBuildType(buildTypeOption) {
    if (!buildTypes.includes(buildTypeOption)) {
        throw new Error(`Invalid build type: ${buildTypeOption}. Supported architectures ${buildTypes}`);
    }

    return buildTypeOption;
}

function validateArchitectures(arch) {
    if (!architectures.includes(arch)) {
        throw new Error(`"Invalid architecture ${arch}. Supported architectures ${architectures}`);
    }

    return arch;
}