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

/* eslint-env es6, node */

'use strict';

class Worker {
    constructor(script, args) {
        let options;
        if (process.execArgv.find(arg => arg.indexOf("--debug="))) {
            options = { execArgv: ['--debug=44725'] };
        }

        this._process = require('child_process').fork(script, args, options);

        this._process.on('message', (message) => {
            if (this.onmessage) {
                this.onmessage(message);
            }
        });
    }
    postMessage(message) {
        if (this._process) {
            this._process.send(message);
        }
    }
    terminate(cb) {
        if (!cb) {
            cb = function() { };
        }

        if (this._process) {
            this._process.once('close', cb);
            this._process.kill();
            delete this._process;
        } else {
            cb();
        }
    }
}

module.exports = Worker;
