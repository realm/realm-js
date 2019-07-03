////////////////////////////////////////////////////////////////////////////
//
// Copyright 2019 Realm Inc.
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

import { keys, objectTypes } from './constants';
import { createMethods } from './util';

export default class AsyncOpenTask {
}

createMethods(AsyncOpenTask.prototype, objectTypes.ASYNCOPENTASK, [
    'addDownloadNotification',
    'cancel',
]);

export function createAsyncOpenTask(realmId, info) {
    let task = Object.create(AsyncOpenTask.prototype);
    task[keys.realm] = "(AsyncOpenTask object)";
    task[keys.id] = info.id;
    task[keys.type] = objectTypes.ASYNCOPENTASK;
    return task;
}

