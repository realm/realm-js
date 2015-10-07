'use strict';

const Realm = require('realm');

module.exports = new Realm({
    schema: [
        {
            name: 'Todo',
            properties: [
                {name: 'text', type: Realm.Types.STRING},
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
