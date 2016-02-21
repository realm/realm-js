/* Copyright 2015 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */

'use strict';

import Realm from 'realm';

class Todo {}
Todo.schema = {
    name: 'Todo',
    properties: {
        done: {type: Realm.Types.BOOL, default: false},
        text: Realm.Types.STRING,
    },
};
class TodoList {}
TodoList.schema = {
    name: 'TodoList',
    properties: {
        name: Realm.Types.STRING,
        items: {type: Realm.Types.LIST, objectType: 'Todo', default: []},
    },
};
export default new Realm({schema: [Todo, TodoList]});
