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

const cp = nodeRequire('child_process');
const os = nodeRequire('os');

class Worker {
    constructor(modulePath, options={}) {
        this.modulePath = modulePath;
        this.maxWorkers = options.maxWorkers || os.cpus().length;
        this.env = options.env || {};
        //change the default for argv because child process expects argv to be an array
        this.execArgv = options.execArgv || [];

        this._workers = [];
        this._waiting = [];
        this._workQueue = [];
        this._changeObjects = {};

        this._startWorker();
    }

    onavailable(path) {
        this._push({message: 'available', path});
    }

    ondelete(change) {
        const serialized = change.serialize();
        change.refCount = (change.refCount || 0) + 1;
        this._changeObjects[serialized] = change;
        this._push({message: 'delete', change: serialized});
    }

    onchange(change) {
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
        if (this._stopping) {
            return;
        }

        this._workQueue.push(message);
        this._next();
    }

    _startWorker() {
        const child = cp.fork(__dirname + '/notification-worker.js', [], {
            env: this.env,
            execArgv: this.execArgv
        });
        child.on('message', (m) => {
            if (m.change) {
                const changeObj = this._changeObjects[m.change];
                delete this._changeObjects[m.change];
                changeObj.release();
            }
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
        this._waiting.push(child);
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
            if (this._workers.length < this.maxWorkers) {
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
