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

const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const child_process = require('child_process');
const fetch = require('node-fetch');
const ini = require('ini').parse;
const decompress = require('decompress');

function exec() {
    const args = Array.from(arguments);
    return new Promise((resolve, reject) => {
        function callback(error, stdout, stderr) {
            if (error) {
                reject(error);
            } else {
                resolve(stdout.trim());
            }
        }
        args.push(callback);
        child_process.exec.apply(null, args);
    });
}

function printProgress(input, totalBytes, archive) {
    const ProgressBar = require('progress');
    const StreamCounter = require('stream-counter');

    const message = `Downloading ${archive} [:bar] (:ratek)`;
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

function download(serverFolder, archive, destination) {
    const url = `https://static.realm.io/downloads/${serverFolder}/${archive}`;
    return fetch(url).then((response) => {
        if (response.status !== 200) {
            throw new Error(`Error downloading ${url} - received status ${response.status} ${response.statusText}`);
        }

        const lastModified = new Date(response.headers.get('Last-Modified'));
        return fs.exists(destination)
                 .then(exists => {
                     if (!exists) {
                         return saveFile();
                     } else {
                         return fs.stat(destination)
                                  .then(stat => {
                                      if (stat.mtime.getTime() !== lastModified.getTime()) {
                                          return saveFile();
                                      }
                         })
                     }
        });

        function saveFile() {
            if (process.stdout.isTTY) {
                printProgress(response.body, parseInt(response.headers.get('Content-Length')), archive);
            } else {
                console.log(`Downloading ${archive}`);
            }
            return new Promise((resolve) => {
                const file = fs.createWriteStream(destination);
                response.body.pipe(file).once('finish', () => file.close(resolve));
            }).then(() => fs.utimes(destination, lastModified, lastModified));
        }
    });
}

function extract(downloadedArchive, targetFolder, archiveRootFolder) {
    console.log(`Extracting ${path.basename(downloadedArchive)} => ${targetFolder}`);
    const decompressOptions = /tar\.xz$/.test(downloadedArchive) ? { plugins: [ require('decompress-tarxz')() ] } : undefined;
    if (!archiveRootFolder) {
        return decompress(downloadedArchive, targetFolder, decompressOptions);
    } else {
        const tempExtractLocation = path.resolve(os.tmpdir(), path.basename(downloadedArchive, path.extname(downloadedArchive)));
        return decompress(downloadedArchive, tempExtractLocation, decompressOptions)
               .then(() => fs.readdir(path.resolve(tempExtractLocation, archiveRootFolder)))
               .then(items => Promise.all(items.map(item => {
                   const source = path.resolve(tempExtractLocation, archiveRootFolder, item);
                   const target = path.resolve(targetFolder, item);
                   return fs.copy(source, target, { filter: n => path.extname(n) !== '.so' });
               })))
               .then(() => fs.remove(tempExtractLocation))
    }
}

function acquireCore(options, dependencies, target) {
    let serverFolder = `core/v${dependencies.REALM_CORE_VERSION}`;
    let flavor = options.debug ? 'Debug' : 'Release';

    let archive, archiveRootFolder;
    switch (options.platform) {
    case 'mac':
        serverFolder += `/macos/${flavor}`;
        archive = `realm-core-${flavor}-v${dependencies.REALM_CORE_VERSION}-Darwin-devel.tar.gz`;
        break;
    case 'ios':
        flavor = flavor === 'Debug' ? 'MinSizeDebug' : flavor;
        serverFolder += `/ios/${flavor}`;
        archive = `realm-core-${flavor}-v${dependencies.REALM_CORE_VERSION}-iphoneos.tar.gz`;
        break;
    case 'win':
        if (!options.arch) throw new Error(`Specifying '--arch' is required for platform 'win'`);
        const arch = options.arch === 'ia32' ? 'Win32' : options.arch;
        serverFolder += `/windows/${arch}/nouwp/${flavor}`;
        archive = `realm-core-${flavor}-v${dependencies.REALM_CORE_VERSION}-Windows-${arch}-devel.tar.gz`;
        break;
    case 'linux':
        serverFolder = 'core';
        archive = `realm-core-${dependencies.REALM_CORE_VERSION}.tgz`;
        archiveRootFolder = `realm-core-${dependencies.REALM_CORE_VERSION}`;
        break;
    }

    const downloadedArchive = path.resolve(os.tmpdir(), archive);
    return download(serverFolder, archive, downloadedArchive)
           .then(() => extract(downloadedArchive, target, archiveRootFolder));
}

function getSyncCommitSha(version) {
  return exec(`git ls-remote git@github.com:realm/realm-sync.git --tags "v${version}^{}"`)
         .then(stdout => {
           if (!Boolean(stdout)) {
             return exec(`git ls-remote git@github.com:realm/realm-sync.git --tags "v${version}"`)
           } else {
             return stdout;
           }
         }).then(stdout => /([^\t]+)/.exec(stdout)[0]);
}

function acquireSync(options, dependencies, target) {
    let serverFolder = 'sync';
    let flavor = options.debug ? 'Debug' : 'Release';

    let archive, archiveRootFolder;
    let promise = Promise.resolve();
    switch (options.platform) {
    case 'mac':
        archive = `realm-sync-node-cocoa-${dependencies.REALM_SYNC_VERSION}.tar.gz`;
        archiveRootFolder = `realm-sync-node-cocoa-${dependencies.REALM_SYNC_VERSION}`;
        break;
    case 'ios':
        archive = `realm-sync-cocoa-${dependencies.REALM_SYNC_VERSION}.tar.xz`;
        archiveRootFolder = `core`;
        break;
    case 'win':
        promise = acquireCore(options, dependencies, target)
                  .then(() => getSyncCommitSha(dependencies.REALM_SYNC_VERSION))
                  .then(sha => serverFolder += `/sha-version/${sha}`);
        const arch = options.arch === 'ia32' ? 'Win32' : options.arch;
        archive = `realm-sync-${flavor}-v${dependencies.REALM_SYNC_VERSION}-Windows-${arch}-devel.tar.gz`;
        break;
    default:
        throw new Error(`Unsupported sync platform '${options.platform}'`);
    }

    const downloadedArchive = path.resolve(os.tmpdir(), archive);
    return promise
           .then(() => download(serverFolder, archive, downloadedArchive))
           .then(() => extract(downloadedArchive, target, archiveRootFolder));
}

const optionDefinitions = [
    { name: 'platform', type: String, defaultOption: true },
    { name: 'arch', type: String },
    { name: 'sync', type: Boolean },
    { name: 'debug', type: Boolean },
];
const options = require('command-line-args')(optionDefinitions);
if (options.platform === '..\\win') {
    options.platform = 'win'; // handle gyp idiocy
}

const vendorDir = path.resolve(__dirname, '../vendor');

let realmDir = path.resolve(vendorDir, `realm-${options.platform}`);
if (options.arch) {
    realmDir += `-${options.arch}`;
}
if (options.debug) {
    realmDir += '-dbg'
}

const dependencies = ini(fs.readFileSync(path.resolve(__dirname, '../dependencies.list'), 'utf8'));

const acquire = options.sync ? acquireSync : acquireCore;
fs.emptyDir(realmDir)
  .then(() => acquire(options, dependencies, realmDir))
  .catch(error => console.error(error));
