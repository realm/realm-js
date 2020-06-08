////////////////////////////////////////////////////////////////////////////
//
// Copyright 2020 Realm Inc.
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

"use strict";


module.exports = {
    /**
     * Helper to wrap callback-taking C++ function into a Promise-returning JS function
     * @example
     * // floop() is a wrapper method on a type with a _floop C++ method.
     * function floop(how, why) {
     *   return promisify(cb => this._floop(how, why, cb));
     * }
     */
    promisify(func) {
        return new Promise((resolve, reject) => {
            func((...cbargs) => {
                if (cbargs.length < 1 || cbargs.length > 2)
                    throw Error(`invalid cbargs length ${cbargs.length}`)
                let error = cbargs[cbargs.length-1];
                if (error) {
                    reject(error);
                } else if (cbargs.length == 2) {
                    resolve(cbargs[0]);
                } else {
                    resolve();
                }
            });
        });
    },
}
