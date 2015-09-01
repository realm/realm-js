#!/usr/bin/env node

/*
    Licensed to the Apache Software Foundation (ASF) under one
    or more contributor license agreements.  See the NOTICE file
    distributed with this work for additional information
    regarding copyright ownership.  The ASF licenses this file
    to you under the Apache License, Version 2.0 (the
    "License"); you may not use this file except in compliance
    with the License.  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing,
    software distributed under the License is distributed on an
    "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
    KIND, either express or implied.  See the License for the
    specific language governing permissions and limitations
    under the License.
*/

// This script copies the www directory into the Xcode project.

// This script should not be called directly.
// It is called as a build step from Xcode.

var BUILT_PRODUCTS_DIR = process.env.BUILT_PRODUCTS_DIR,
    FULL_PRODUCT_NAME = process.env.FULL_PRODUCT_NAME,
    COPY_HIDDEN = process.env.COPY_HIDDEN,
    PROJECT_FILE_PATH = process.env.PROJECT_FILE_PATH;

var path = require('path'),
    fs = require('fs'),
    shell = require('shelljs'),
    glob = require('glob'),
    srcDir = 'www',
    dstDir = path.join(BUILT_PRODUCTS_DIR, FULL_PRODUCT_NAME),
    dstWwwDir = path.join(dstDir, 'www');

if(!BUILT_PRODUCTS_DIR) {
    console.error('The script is meant to be run as an Xcode build step and relies on env variables set by Xcode.');
    process.exit(1);
}

try {
    fs.statSync(srcDir);
} catch (e) {
    console.error('Path does not exist: ' + srcDir);
    process.exit(1);
}

// Code signing files must be removed or else there are
// resource signing errors.
shell.rm('-rf', dstWwwDir);
shell.rm('-rf', path.join(dstDir, '_CodeSignature'));
shell.rm('-rf', path.join(dstDir, 'PkgInfo'));
shell.rm('-rf', path.join(dstDir, 'embedded.mobileprovision'));

// Copy www dir recursively
if(!!COPY_HIDDEN) {
    shell.mkdir('-p', dstWwwDir);
    shell.cp('-r', glob.sync(srcDir + '/**', { dot: true }), dstWwwDir);
} else {
    shell.cp('-r', srcDir, dstDir);
}

// Copy the config.xml file.
shell.cp('-f', path.join(path.dirname(PROJECT_FILE_PATH), path.basename(PROJECT_FILE_PATH, '.xcodeproj'), 'config.xml'),
    dstDir);
