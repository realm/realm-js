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

import Realm from 'realm';

class Task extends Realm.Object {}
Task.schema = {
    name: 'Task',
    properties: {
        completed: {type: 'bool', default: false},
        text: 'string',
    },
};

class TaskList extends Realm.Object {}
TaskList.schema = {
    name: 'TaskList',
    properties: {
        id: 'string',
        text: 'string',
        completed: {type: 'bool', default: false},
        items: {type: 'list', objectType: 'Task'},
    },
    primaryKey: 'id'
};


class TaskListList extends Realm.Object {}
TaskListList.schema = {
    name: 'TaskListList',
    properties: {
        id: 'int',
        items: {type: 'list', objectType: 'TaskList'},
    },
    primaryKey: 'id'
};

var adminToken = "ewoJImlkZW50aXR5IjogImFkbWluIiwKCSJhY2Nlc3MiOiBbInVwbG9hZCIsICJkb3dubG9hZCIsICJtYW5hZ2UiXQp9Cg==:I1mEfddNdQo4wS/7dVgEIEm9pv7pLEyyx3zmGgWMCxkEHOxz8DxLjm/yLD8OD7iE9XcCHy4xs6SOu2ZbbRysezssyY+3z/anrz7u/EBDvyfHPRakaw3rTpD6RcTb4SaAeLBagtDP7YqycneZrGd3oUXofvJdWg4YpDOvr/+1zwntt3DGg5D1ghKzSWcF7FnosswjiqGk91t2hbZbPYNEPEJKwkCPj0exOZqQ73627rD9Jzbr3CcHpp0V4U1BEhVfgZyo9dchWYT9Qw0rkqjqc5ylvR73Ihpa9hN9+wKxhU1K6nNzsbhrD0sMfOOlxsuduWHrhiT8vkTL/WFOO4vC1Q==";
var adminUser = Realm.Sync.User.adminUser(adminToken);
export default new Realm({
                         schema: [Task, TaskList, TaskListList],
                         sync: {
                            user: adminUser,
                            url: "realm://192.168.10.41:9080/a46feb0c3959646acb7540971c411269/realmtasks"
                         },
                         path: "tasks.realm"
                         });
