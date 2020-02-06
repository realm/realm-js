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

const cp = nodeRequire('child_process');
const os = nodeRequire('os');

class Worker {
    constructor(modulePath, options={}) {
        this.modulePath = modulePath;
        this.maxWorkers = options.maxWorkers || os.cpus().length;
        this.env = options.env || {};
        this.execArgv = options.execArgv || [];

        this._workers = [];
        this._waiting = [];
        this._workQueue = [];
        this._changeObjects = {};

        this.firstWorker = this._startWorker();
    }

    onavailable(path) {
        if (!this._stopping) {
            this._push({message: 'available', path});
        }
    }

    ondelete(change) {
        if (this._stopping) {
            change.release();
            return;
        }

        const serialized = change.serialize();
        change.refCount = (change.refCount || 0) + 1;
        this._changeObjects[serialized] = change;
        this._push({message: 'delete', change: serialized});
    }

    onchange(change) {
        if (this._stopping) {
            change.release();
            return;
        }

        const serialized = change.serialize();
        change.refCount = (change.refCount || 0) + 1;
        this._changeObjects[serialized] = change;
        this._push({message: 'change', change: serialized});
    }

    stop() {
        this._stopping = true;
        return new Promise((r) => {
            this._shutdownComplete = r;
            this._next();
        });
    }

    _push(message) {
        this._workQueue.push(message);
        this._next();
    }

    _startWorker() {
        const child = cp.fork(__dirname + '/notification-worker.js', [], {
            env: this.env,
            execArgv: this.execArgv
        });
        let promise = new Promise(r => { child.resolveStartup = r; });
        child.on('message', (m) => {
            if (m.change) {
                const changeObj = this._changeObjects[m.change];
                delete this._changeObjects[m.change];
                changeObj.release();
            }
            child.resolveStartup();
            this._waiting.push(child);
            this._next();
        });
        child.on('exit', (code, signal) => {
            if (code !== 0) {
                console.error(`Unexpected exit code from child: ${code} ${signal}`);
            }
            this._workers = this._workers.filter(c => c !== child);
            this._next();
        });
        child.send({message: 'load', module: this.modulePath});
        this._workers.push(child);
        return promise;
    }

    _next() {
        if (this._stopping && this._workQueue.length === 0) {
            for (const worker of this._workers) {
                if (!worker.stopping) {
                    worker.send({message: 'stop'});
                    worker.stopping = true;
                }
            }
            if (this._workers.length === 0) {
                this._shutdownComplete();
            }
            return;
        }
        if (this._workQueue.length === 0) {
            return;
        }
        if (this._waiting.length === 0) {
            if (this._workers.length < this.maxWorkers && this._workers.length < this._workQueue.length) {
                this._startWorker();
            }
            return;
        }
        const worker = this._waiting.shift();
        const message = this._workQueue.shift();
        worker.send(message);
    }
}

module.exports = Worker;
