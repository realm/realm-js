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
const fetch = require('node-fetch');
const HttpsProxyAgent = require('https-proxy-agent');
const ini = require('ini');
const tar = require('tar');
const crypto = require('crypto');

const LOCKFILE_NAME = 'download-realm.lock';

const TEMP_DIR_SUFFIX = generateRandomString();

function generateRandomString() {
    return crypto.randomBytes(20).toString('hex');
}

function ensureDirExists(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
}

function getTempDir() {
    /*
     * Each run of this script will have it's own temp directory.
     * That way, parallel runs of this script on a same computer won't
     * conflict.
     *
     * It is also possible to overrride this temp directory by setting
     * REALM_DOWNLOAD_CORE_TEMP_DIR so, for instance, CI systems will
     * be able to clean up files.
     */
    return process.env.REALM_DOWNLOAD_CORE_TEMP_DIR ||
        path.join(os.tmpdir(), TEMP_DIR_SUFFIX);
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

    input.pipe(new StreamCounter()).on('progress', function () {
        bar.tick((this.bytes / 1024) - bar.curr);
    });
}

function download(serverFolder, archive, destination) {
    const url = `https://static.realm.io/downloads/${serverFolder}/${archive}`;
    console.log(`Download url: ${url}`);
    const proxyUrl = process.env.HTTP_PROXY || process.env.http_proxy || process.env.HTTPS_PROXY || process.env.https_proxy;
    let agent;
    if (proxyUrl) {
        const agentOpts = require('url').parse(proxyUrl);
        agent = new HttpsProxyAgent(agentOpts);
    }
    return fetch(url, { agent }).then(response => {
        if (response.status !== 200) {
            throw new Error(`Error downloading ${url} - received status ${response.status} ${response.statusText}`);
        }

        const lastModified = new Date(response.headers.get('Last-Modified'));
        const contentLength = parseInt(response.headers.get('Content-Length'), 10);
        return fs.stat(destination).then(stat => {
            if (stat.mtime.getTime() <= lastModified.getTime() || stat.size !== contentLength) {
                return saveFile(response);
            }
        }).catch(() => saveFile(response));
    });

    function saveFile(response) {
        if (process.stdout.isTTY) {
            printProgress(response.body, parseInt(response.headers.get('Content-Length')), archive);
        } else {
            console.log(`Downloading ${archive}`);
        }
        return new Promise((resolve) => {
            const file = fs.createWriteStream(destination);
            response.body.pipe(file).once('finish', () => file.close(resolve));
        });
    }
}

function extract(downloadedArchive, targetFolder, archiveRootFolder) {
    console.log(`Extracting ${path.basename(downloadedArchive)} => ${targetFolder}`);
    if (!archiveRootFolder) {
        ensureDirExists(targetFolder);
        return tar.extract({ file: downloadedArchive, cwd: targetFolder });
    } else {
        const base = path.basename(downloadedArchive).split('.');
        const tempExtractLocation = path.resolve(getTempDir(), base.slice(0, base.length - 2).join('.'));
        ensureDirExists(tempExtractLocation);
        return tar.extract({ file: downloadedArchive, cwd: tempExtractLocation })
            .then(() => fs.readdir(path.resolve(tempExtractLocation, archiveRootFolder)))
            .then(items => Promise.all(items.map(item => {
                const source = path.resolve(tempExtractLocation, archiveRootFolder, item);
                const target = path.resolve(targetFolder, item);
                return fs.copy(source, target, { filter: n => path.extname(n) !== '.so' });
            })))
            .then(() => fs.remove(tempExtractLocation))
    }
}

function acquire(desired, target) {
    const corePath = desired.CORE_ARCHIVE && path.resolve(getTempDir(), desired.CORE_ARCHIVE);
    const syncPath = desired.SYNC_ARCHIVE && path.resolve(getTempDir(), desired.SYNC_ARCHIVE);
    const openSSLPath = desired.OPENSSL && path.resolve(getTempDir(), "openssl.tar.gz");

    return fs.emptyDir(target)
        .then(() => corePath && download(desired.CORE_SERVER_FOLDER, desired.CORE_ARCHIVE, corePath))
        .then(() => corePath && extract(corePath, target, desired.CORE_ARCHIVE_ROOT))
        .then(() => syncPath && download(desired.SYNC_SERVER_FOLDER, desired.SYNC_ARCHIVE, syncPath))
        .then(() => syncPath && extract(syncPath, target, desired.SYNC_ARCHIVE_ROOT))
        .then(() => openSSLPath && download("openssl/1.1.1b/Linux/x86_64", "openssl.tgz", openSSLPath))
        .then(() => openSSLPath && extract(openSSLPath, path.resolve(target, "openssl"), ""))
        .then(() => writeLockfile(target, desired))
}

function getCoreRequirements(dependencies, options, required = {}) {
    required.CORE_SERVER_FOLDER = `core/v${dependencies.REALM_CORE_VERSION}`;
    let flavor = options.debug ? 'Debug' : 'Release';

    switch (options.platform) {
        case 'mac':
            required.CORE_SERVER_FOLDER += `/macosx/${flavor}`;
            required.CORE_ARCHIVE = `realm-core-${flavor}-v${dependencies.REALM_CORE_VERSION}-macosx-devel.tar.gz`;
            return required;
        case 'ios':
            flavor = flavor === 'Debug' ? 'MinSizeDebug' : flavor;
            required.CORE_SERVER_FOLDER += `/ios/${flavor}`;
            required.CORE_ARCHIVE = `realm-core-${flavor}-v${dependencies.REALM_CORE_VERSION}-iphoneos.tar.gz`;
            return required;
        case 'win': {
            if (!options.arch) throw new Error(`Specifying '--arch' is required for platform 'win'`);
            const arch = options.arch === 'ia32' ? 'Win32' : options.arch;
            required.CORE_SERVER_FOLDER += `/windows/${arch}/nouwp/${flavor}`;
            required.CORE_ARCHIVE = `realm-core-${flavor}-v${dependencies.REALM_CORE_VERSION}-Windows-${arch}-devel.tar.gz`;
            return required;
        }
        case 'linux':
            required.CORE_SERVER_FOLDER += `/linux/${flavor}`;
            required.CORE_ARCHIVE = `realm-core-${flavor}-v${dependencies.REALM_CORE_VERSION}-Linux-devel.tar.gz`;
            required.OPENSSL = "https://static.realm.io/downloads/openssl/1.1.1b/Linux/x86_64/openssl.tgz";
            return required;
        default:
            throw new Error(`Unsupported core platform '${options.platform}'`);
    }
}

function getSyncRequirements(dependencies, options, required = {}) {
    required.SYNC_SERVER_FOLDER = 'sync';
    let flavor = options.debug ? 'Debug' : 'Release';

    switch (options.platform) {
        case 'mac':
            required.SYNC_ARCHIVE = `realm-sync-node-cocoa-${dependencies.REALM_SYNC_VERSION}.tar.gz`;
            required.SYNC_ARCHIVE_ROOT = `realm-sync-node-cocoa-${dependencies.REALM_SYNC_VERSION}`;
            return required;
        case 'ios':
            required.SYNC_ARCHIVE = `realm-sync-cocoa-${dependencies.REALM_SYNC_VERSION}.tar.gz`;
            required.SYNC_ARCHIVE_ROOT = `core`;
            return required;
        case 'win': {
            const arch = options.arch === 'ia32' ? 'Win32' : options.arch;
            required.SYNC_ARCHIVE = `realm-sync-${flavor}-v${dependencies.REALM_SYNC_VERSION}-Windows-${arch}-devel.tar.gz`;
            return getCoreRequirements(dependencies, options, required);
        }
        case 'linux':
            // flavor is ignored since we only publish Release mode
            required.SYNC_ARCHIVE = `realm-sync-Release-v${dependencies.REALM_SYNC_VERSION}-Linux-devel.tar.gz`;
            required.OPENSSL = "https://static.realm.io/downloads/openssl/1.1.1b/Linux/x86_64/openssl.tgz";
            return getCoreRequirements(dependencies, options, required);
        default:
            throw new Error(`Unsupported sync platform '${options.platform}'`);
    }
}

function writeLockfile(target, contents) {
    return fs.writeFile(path.resolve(target, LOCKFILE_NAME), ini.encode(contents));
}

function readLockfile(target) {
    try {
        return ini.parse(fs.readFileSync(path.resolve(target, LOCKFILE_NAME), 'utf8'));
    } catch (e) {
        return null;
    }
}

function shouldSkipAcquire(target, requirements, force) {
    if (force) {
        console.log('Skipping lockfile check as --force is enabled');
        return false;
    }

    const existingLockfile = readLockfile(target);

    if (!existingLockfile) {
        console.log('No lockfile found at the target, proceeding.');
        return false;
    }

    if (!Object.keys(requirements).every(key => existingLockfile[key] === requirements[key])) {
        console.log('Target directory has a differing lockfile, overwriting.');
        return false;
    }

    console.log('Matching lockfile already exists at target - nothing to do (use --force to override)');
    return true;
}

const optionDefinitions = [
    { name: 'platform', type: String, defaultOption: true },
    { name: 'arch', type: String },
    { name: 'sync', type: Boolean },
    { name: 'debug', type: Boolean },
    { name: 'force', type: Boolean },
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

ensureDirExists(getTempDir());

const dependencies = ini.parse(fs.readFileSync(path.resolve(__dirname, '../dependencies.list'), 'utf8'));

const requirements = (options.sync ? getSyncRequirements : getCoreRequirements)(dependencies, options);

console.log('Resolved requirements:', requirements);
console.log('Resolved options:', options);

if (!shouldSkipAcquire(realmDir, requirements, options.force)) {
    acquire(requirements, realmDir)
        .then(() => console.log('Success'))
        .catch(error => {
            console.error(error);
            process.exit(1);
        });
}
