////////////////////////////////////////////////////////////////////////////
//
// Copyright 2017 Realm Inc.
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

// Prevent React Native packager from seeing modules required with this
const nodeRequire = require;

const Worker = nodeRequire('./worker');

class FunctionListener {
    constructor(regex, regexStr, event, fn) {
        this.regex = regex;
        this.regexStr = regexStr;
        this.event = event;
        this.fn = fn;
        this.seen = {};
        this.pending = [];
    }

    stop() {
        return Promise.all(this.pending);
    }

    matches(regex, event, fn) {
        return this.regexStr === regex && this.event === event && this.fn === fn;
    }

    onavailable(path, id) {
        if (this.regex.test(path)) {
            if (this.event === 'available' && !this.seen[id]) {
                this.fn(path);
                this.seen[id] = true;
            }
            return this.event === 'change';
        }
        return false;
    }

    invoke(changes, arg) {
        let promise;
        try {
            promise = Promise.resolve(this.fn(arg));
        }
        catch (e) {
            changes.release();
            throw e;
        }

        this.pending.push(promise);
        const release = () => {
            changes.release();
            this.pending.splice(this.pending.indexOf(promise), 1);
        };
        promise.then(release).catch(e => {
            release();
            throw e;
        });
    }

    onchange(changes) {
        if (this.event !== 'change' || !this.regex.test(changes.path)) {
            changes.release();
            return;
        }
        if (changes.isEmpty) {
            changes.release();
            return;
        }

        this.invoke(changes, changes);
    }

    ondelete(changes) {
        if (this.event !== 'delete' || !this.regex.test(changes.path)) {
            changes.release();
            return;
        }

        this.invoke(changes, changes.path);
    }
}

class OutOfProcListener {
    constructor(regex, regexStr, worker) {
        this.regex = regex;
        this.regexStr = regexStr;
        this.worker = worker;
        this.seen = {};
    }

    stop() {
        return this.worker.stop();
    }

    matches(regex, worker) {
        return this.regexStr === regex && this.worker === worker;
    }

    onavailable(path, id) {
        if (this.regex.test(path)) {
            if (!this.seen[id]) {
                this.worker.onavailable(path);
                this.seen[id] = true;
            }
            return true;
        }
        return false;
    }

    onchange(changes) {
        if (!this.regex.test(changes.path)) {
            return;
        }
        this.worker.onchange(changes);
    }

    ondelete(changes) {
        if (!this.regex.test(changes.path)) {
            return;
        }
        this.worker.ondelete(changes);
    }
}

class Listener {
    constructor(Sync, config) {
        this.notifier = Sync._createNotifier(config.serverUrl, config.adminUser, (event, a1, a2) => this[event](a1, a2), config.sslConfiguration, config.listenerDirectory);
        this.initPromises = [];
        this.callbacks = [];
    }

    // callbacks for C++ functions
    downloadComplete() {
        this.initComplete = true;
        this._notifyDownloadComplete();
    }

    error(err) {
        this.err = err;
        this.initComplete = true;
        this._notifyDownloadComplete();
    }

    change() {
        const changes = this.notifier.next();
        if (!changes) {
            return;
        }
        let refCount = 1;
        changes.release = () => {
            if (--refCount === 0) {
                changes.close();
            }
        };

        for (const callback of this.callbacks) {
            ++refCount;
            callback[changes.event](changes);
        }
        changes.release();
    }

    available(virtualPath, id) {
        let watch = false;
        id = id || virtualPath;
        for (const callback of this.callbacks) {
            if (callback.onavailable(virtualPath, id)) {
                watch = true;
            }
        }
        return watch;
    }

    // public API implementation
    add(regexStr, event, fn) {
        const regex = new RegExp(regexStr);

        if (typeof fn === 'function') {
            this.callbacks.push(new FunctionListener(regex, regexStr, event, fn));
        }
        else if (event instanceof Worker) {
            this.callbacks.push(new OutOfProcListener(regex, regexStr, event));
        }
        else {
            throw new Error(`Invalid arguments: must supply either event name and callback function or a Worker, got (${event}, ${fn})`);
        }

        const promise = new Promise((resolve, reject) => {
            this.initPromises.push([resolve, reject]);
        });
        this._notifyDownloadComplete();
        this.notifier.start();
        return promise;
    }

    remove(regex, event, callback) {
        for (let i = 0; i < this.callbacks.length; ++i) {
            if (this.callbacks[i].matches(regex, event, callback)) {
                const ret = this.callbacks[i].stop();
                this.callbacks.splice(i, 1);
                return ret;
            }
        }
        return Promise.resolve();
    }

    removeAll() {
        let ret = Promise.all(this.callbacks.map(c => c.stop()));
        this.callbacks = [];
        return ret;
    }

    get isEmpty() {
        return this.callbacks.length === 0;
    }

    // helpers
    _notifyDownloadComplete() {
        if (!this.initComplete) {
            return;
        }
        if (this.err) {
            for (let [_, reject] of this.initPromises) {
                setImmediate(() => reject(this.err));
            }
        }
        else {
            for (let [resolve, _] of this.initPromises) {
                setImmediate(resolve);
            }
        }
        this.initPromises = [];
    }
}

let listenerDirectory = 'realm-object-server/listener';
let listener;
function addListener(server, user, regex, event, callback) {
    // Assume the new API is used, but we cannot change the method signature without it being a breaking change.
    let _config = server;
    let _event = user;
    let _callback = regex;

    // If the old API is used, convert all arguments to the new API
    // If `event` is a Worker, only 4 arguments are provided
    if (arguments.length > 3) {
        _config = {
            serverUrl: server,
            adminUser:  user,
            filterRegex: regex
            // SSL Configuration not supported in the old API
        };
        _event = event;
        _callback = callback;
    }
    if (!_config.listenerDirectory) {
        _config.listenerDirectory = listenerDirectory;
    }

    if (!listener) {
        listener = new Listener(this, _config);
    }
    return listener.add(_config.filterRegex, _event, _callback);
}

function removeListener(regex, event, callback) {
    if (!listener) {
        return Promise.resolve();
    }

    let ret = listener.remove(regex, event, callback);
    if (listener.isEmpty) {
        listener.notifier.close();
        listener = null;
    }
    return ret;
}

function removeAllListeners() {
    if (!listener) {
        return Promise.resolve();
    }

    let ret = listener.removeAll();
    listener.notifier.close();
    listener = null;
    return ret;
}

function getListenerDirectory() {
    return listenerDirectory;
}

function setListenerDirectory(dir) {
    if (listener) {
        throw new Error("The listener directory can't be changed when there are active listeners.");
    }
    listenerDirectory = dir;
}

function localListenerRealms(Realm, regexStr) {
    let allRealms = this._localListenerRealms(listenerDirectory);
    let realms = [];
    if (allRealms) {
        const regex = new RegExp(regexStr);
        for (let i = 0; i < allRealms.length; i += 2) {
            if (regex.test(allRealms[i])) {
                realms.push({
                    path: allRealms[i],
                    realm: () => new Realm({path: allRealms[i + 1], sync: true})
                });
            }
        }
    }
    return realms;
}

module.exports = function(Realm) {
    Realm.Sync.getListenerDirectory = getListenerDirectory;
    Realm.Sync.setListenerDirectory = setListenerDirectory;
    Realm.Sync.addListener = addListener.bind(Realm.Sync);
    Realm.Sync.removeListener = removeListener;
    Realm.Sync.removeAllListeners = removeAllListeners;
    Realm.Sync.localListenerRealms = localListenerRealms.bind(Realm.Sync, Realm);
};
