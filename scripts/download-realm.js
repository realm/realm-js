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
const path = require('path');
const os = require('os');
const fetch = require('node-fetch');
const ini = require('ini').parse;
const decompress = require('decompress');

function decompressXZ() {
    // taken from https://github.com/kevva/decompress-tarxz undex the MIT license
    // we don't add it as a dependency because it depends on too old a version of lzma-native
    // which doesn't have node-pre-gyp binaries for recent Node versions

    const decompressTar = require('decompress-tar');
    const fileType = require('file-type');
    const isStream = require('is-stream');
    const lzmaNative = require('lzma-native');

    return function(input) {
        if (!Buffer.isBuffer(input) && !isStream(input)) {
            return Promise.reject(new TypeError(`Expected a Buffer or Stream, got ${typeof input}`));
        }

        if (Buffer.isBuffer(input) && (!fileType(input) || fileType(input).ext !== 'xz')) {
        	return Promise.resolve([]);
        }

        const decompressor = lzmaNative.createDecompressor();
        const result = decompressTar()(decompressor);

        if (Buffer.isBuffer(input)) {
            decompressor.end(input);
        } else {
            input.pipe(decompressor);
        }

        return result;
    }
}

function printProgress(input, totalBytes) {
    const ProgressBar = require('progress');
    const StreamCounter = require('stream-counter');

    const message = 'Downloading Realm binaries [:bar] (:ratek)';
    const bar = new ProgressBar(message, {
       complete: '=',
       incomplete: ' ',
       width: process.stdout.columns - message.length,
       total: totalBytes / 1024
     });

     input.pipe(new StreamCounter()).on('progress', function() {
         bar.tick((this.bytes / 1024) - bar.curr);
     });
}

function download(url, destination) {
    return fetch(url).then((response) => {
        if (response.status !== 200) {
            throw new Error(`Error downloading ${url} - received status ${response.status} ${response.statusText}`);
        }
        const totalBytes = parseInt(response.headers.get('Content-Length'));
        if (fs.existsSync(destination) && fs.statSync(destination).size === totalBytes) {
            return;
        }

        if (process.stdout.isTTY) {
            printProgress(response.body, totalBytes);
        } else {
            console.log(`Downloading ${url}`);
        }
        return new Promise((resolve) => {
            const file = fs.createWriteStream(destination);
            response.body.pipe(file).once('finish', () => file.close(resolve));
        });
    });
}

const optionDefinitions = [
    { name: 'platform', type: String, defaultOption: true },
    { name: 'arch', type: String },
    { name: 'sync', type: Boolean },
    { name: 'debug', type: Boolean },
];
const options = require('command-line-args')(optionDefinitions);
console.log(options);

let serverFolder, archive, extractedFolder;

const dependencies = ini(fs.readFileSync(path.resolve(__dirname, '../dependencies.list'), 'utf8'));
if (!options.sync) {
    serverFolder = `core/v${dependencies.REALM_CORE_VERSION}/`;
    let flavor = options.debug ? 'Debug' : 'Release';

    switch (options.platform) {
    case 'mac':
        serverFolder += `macos/${flavor}`;
        archive = `realm-core-${flavor}-v${dependencies.REALM_CORE_VERSION}-Darwin-devel.tar.xz`;
        break;
    case 'ios':
        flavor = flavor === 'Debug' ? 'MinSizeDebug' : flavor;
        serverFolder += `ios/${flavor}`;
        archive = `realm-core-${flavor}-v${dependencies.REALM_CORE_VERSION}-iphoneos.tar.xz`;
        break;
    case '..\\win': // handle gyp idiocy
        options.platform = 'win';
    case 'win':
        const arch = options.arch === 'ia32' ? 'Win32' : options.arch;
        serverFolder += `windows/${arch}/nouwp/${flavor}`;
        archive = `realm-core-${flavor}-v${dependencies.REALM_CORE_VERSION}-Windows-${arch}-devel.tar.gz`;
        break;
    case 'linux':
        serverFolder = 'core';
        archive = `realm-core-${dependencies.REALM_CORE_VERSION}.tgz`;
        extractedFolder = `realm-core-${dependencies.REALM_CORE_VERSION}`;
        break;
    }
} else {
    serverFolder = 'sync';
    switch (options.platform) {
    case 'mac':
        archive = `realm-sync-node-cocoa-${dependencies.REALM_SYNC_VERSION}.tar.gz`;
        extractedFolder = `realm-sync-node-cocoa-${dependencies.REALM_SYNC_VERSION}`;
        break;
    case 'ios':
        archive = `realm-sync-cocoa-${dependencies.REALM_SYNC_VERSION}.tar.xz`;
        extractedFolder = `core`;
        break;
    }
}

if (!archive) {
    process.exit();
}

const url = `https://static.realm.io/downloads/${serverFolder}/${archive}`;
const vendorDir = path.resolve(__dirname, '../vendor');
const downloadedArchive = path.resolve(os.tmpdir(), archive);

let realmDir = path.resolve(vendorDir, `realm-${options.platform}`);
if (options.arch) {
    realmDir += `-${options.arch}`;
}
if (options.debug) {
    realmDir += '-dbg'
}

if (!fs.existsSync(realmDir)) {
    const targetFolder = extractedFolder ? vendorDir : realmDir;

    const decompressOptions = /tar\.xz$/.test(archive) ? { plugins: [ decompressXZ() ] } : undefined;

    let pipeline = download(url, downloadedArchive);
    pipeline = pipeline.then(() => decompress(downloadedArchive, targetFolder, decompressOptions));

    if (extractedFolder) {
        pipeline = pipeline.then(() => {
            fs.renameSync(path.resolve(vendorDir, extractedFolder), realmDir);
            const libDir = path.resolve(realmDir, 'lib')
            if (fs.existsSync(libDir)) {
                // Remove all shared libraries as we want to just use the static ones
                fs.readdirSync(libDir)
                  .filter(name => /\.so$/.test(name))
                  .forEach(name => fs.unlinkSync(path.resolve(libDir, name)));
            }
        });
    }

    pipeline.catch(error => {
        console.log('Downloading Realm binaries failed with', error);
        process.exit(-1);
    });
}
