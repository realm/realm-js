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

const require_method = require;

// Prevent React Native packager from seeing modules required with this
function nodeRequire(module) {
    return require_method(module);
}

const Worker = nodeRequire('./worker');

class FunctionListener {
    constructor(regex, regexStr, event, fn) {
        this.regex = regex;
        this.regexStr = regexStr;
        this.event = event;
        this.fn = fn;
        this.seen = {};
    }

    stop() {
        return Promise.resolve();
    }

    matches(regex, event, fn) {
        return this.regexStr === regex && this.event === event && this.fn === fn;
    }

    onavailable(path) {
        if (this.regex.test(path)) {
            if (this.event === 'available' && !this.seen[path]) {
                this.fn(path);
                this.seen[path] = true;
            }
            return this.event === 'change';
        }
        return false;
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
        Promise.resolve(this.fn(changes)).then(() => changes.release());
    }
};

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

    onavailable(path) {
        if (this.regex.test(path)) {
            if (!this.seen[path]) {
                this.worker.onavailable(path);
                this.seen[path] = true;
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
};

class Listener {
    constructor(Sync, server, user) {
        this.notifier = Sync._createNotifier(server, user, (event, arg) => this[event](arg));
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

        let refCount = this.callbacks.length;
        changes.release = () => {
            if (--refCount === 0) {
                changes.close();
            }
        }

        for (const callback of this.callbacks) {
            callback.onchange(changes);
        }
    }

    available(virtualPath) {
        let watch = false;
        for (const callback of this.callbacks) {
            if (callback.onavailable(virtualPath)) {
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
};

let listener;
function addListener(server, user, regex, event, callback) {
    if (!listener) {
        listener = new Listener(this, server, user);
    }
    return listener.add(regex, event, callback);
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

function setListenerDirectory(dir) {
    if (listener) {
        throw new Error("The listener directory can't be changed when there are active listeners.");
    }
    this._setListenerDirectory(dir);
}

module.exports = function(Realm) {
    Realm.Sync.setListenerDirectory = setListenerDirectory.bind(Realm.Sync);
    Realm.Sync.addListener = addListener.bind(Realm.Sync);
    Realm.Sync.removeListener = removeListener;
    Realm.Sync.removeAllListeners = removeAllListeners;
}
