/* Copyright 2015 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */

'use strict';

const Realm = require('realm');

module.exports = new Realm({
    schema: [
        {
            name: 'Todo',
            properties: {
                done: {type: Realm.Types.BOOL, default: false},
                text: Realm.Types.STRING,
            },
        },
        {
            name: 'TodoList',
            properties: {
                name: Realm.Types.STRING,
                items: {type: Realm.Types.LIST, objectType: 'Todo', default: []},
            },
        },
    ],
});
