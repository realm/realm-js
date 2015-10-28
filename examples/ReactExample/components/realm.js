/* Copyright 2015 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */

'use strict';

const Realm = require('realm');

module.exports = new Realm({
    schema: [
        {
            name: 'Todo',
            properties: [
                {name: 'done', type: Realm.Types.BOOL, default: false},
                {name: 'text', type: Realm.Types.STRING, default: ''},
            ]
        },
        {
            name: 'TodoList',
            properties: [
                {name: 'name', type: Realm.Types.STRING},
                {name: 'items', type: Realm.Types.LIST, objectType: 'Todo'},
            ]
        },
    ],
});
