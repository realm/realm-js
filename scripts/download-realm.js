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
const fetch = require('node-fetch');
const ini = require('ini').parse;
const decompress = require('decompress');

function download(url, destination) {
    return fetch(url).then((response) => {
        if (response.status !== 200) {
            throw new Error(`Error downloading ${url} - received status ${response.status} ${response.statusText}`);
        }

        return new Promise((resolve) => {
            const file = fs.createWriteStream(destination);
            response.body.pipe(file)
                         .on('finish', () => {
                             file.close(resolve);
                         });  
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

let product, archive, extractedFolder;

const dependencies = ini(fs.readFileSync(path.resolve(__dirname, '../dependencies.list'), 'utf8'));
if (!options.sync) {
    throw new Error("Downloading core is not yet supported!");
} else {
    product = 'sync';
    switch (options.platform) {
    case 'mac':
        archive = `realm-sync-node-cocoa-${dependencies.REALM_SYNC_VERSION}.tar.gz`
        extractedFolder = `realm-sync-node-cocoa-${dependencies.REALM_SYNC_VERSION}`
    }
}

const url = `https://static.realm.io/downloads/${product}/${archive}`;
const vendorDir = path.resolve(__dirname, '../vendor');
const downloadedArchive = path.resolve(vendorDir, archive);
const realmDir = path.resolve(vendorDir, 'realm-node');

if (!fs.existsSync(realmDir)) {
    const downloadTask = fs.existsSync(downloadedArchive) ? Promise.resolve() : download(url, downloadedArchive);
    downloadTask.then(() => decompress(downloadedArchive, vendorDir))
                .then(() => fs.renameSync(path.resolve(vendorDir, extractedFolder), realmDir));
}