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

function AuthError(problem) {
    const error = Error.call(this, problem.title);

    this.name = 'AuthError';
    this.message = error.message;
    this.stack = error.stack;

    Object.assign(this, problem);
}

AuthError.__proto__ = Error;
AuthError.prototype.__proto__ = Error.prototype;

exports['AuthError'] = AuthError;
