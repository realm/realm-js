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
const unzip = require('extract-zip');

function download(url, destination) {
    return fetch(url).then((response) => {
        if (response.status !== 200) {
            throw new Error(`Error downloading ${url} - received status ${response.status} ${response.statusText}`);
        } else if (response.headers.get('content-type') !== 'application/zip') {
            throw new Error(`Unexpected response content type - ${response.headers.get('content-type')}`);
        } else {
            return new Promise((resolve) => {
                const file = fs.createWriteStream(destination);
                response.body.pipe(file)
                             .on('finish', () => {
                                 file.close(resolve);
                             });  
            });
        }
    });
}

function extract(archive, destination) {
    return new Promise((resolve, reject) => {
        unzip(archive, { dir: destination }, (error) => {
            if (error) {
                reject(error);
            } else {
                resolve();
            }
        });
    });
}

const dependencies = ini(fs.readFileSync(path.resolve(__dirname, '../dependencies.list'), 'utf8'));
const coreArchive = `realm-core-windows-${dependencies.REALM_CORE_VERSION}.zip`;
const coreUrl = `https://static.realm.io/downloads/core/${coreArchive}`;
const vendorDir = path.resolve(__dirname, '../vendor');
const downloadedCoreArchive = path.resolve(vendorDir, coreArchive);
const realmDir = path.resolve(vendorDir, 'realm-node');

if (!fs.existsSync(realmDir)) {
    const downloadTask = fs.existsSync(downloadedCoreArchive) ? Promise.resolve() : download(coreUrl, downloadedCoreArchive);
    downloadTask.then(() => extract(downloadedCoreArchive, realmDir));
}