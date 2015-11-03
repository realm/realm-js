/* Copyright 2015 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */

'use strict';

const constants = require('./constants');
const lists = require('./lists');
const objects = require('./objects');
const results = require('./results');
const rpc = require('./rpc');
const util = require('./util');

const {keys, propTypes, objectTypes} = constants;
const listenersKey = Symbol();

rpc.registerTypeConverter(objectTypes.LIST, lists.create);
rpc.registerTypeConverter(objectTypes.OBJECT, objects.create);
rpc.registerTypeConverter(objectTypes.RESULTS, results.create);

class Realm {
    constructor(config) {
        let schema = typeof config == 'object' && config.schema;
        let constructors = {};

        for (let i = 0, len = schema ? schema.length : 0; i < len; i++) {
            let item = schema[i];
            let proto = item.prototype;

            if (proto && proto.schema) {
                schema.splice(i, 1, proto.schema);
                constructors[proto.schema.name] = item;
            }
        }

        let realmId = rpc.createRealm(Array.from(arguments));

        objects.registerConstructors(realmId, constructors);

        this[keys.id] = realmId;
        this[keys.realm] = realmId;
        this[keys.type] = objectTypes.REALM;
        this[listenersKey] = new Set();

        [
            'path',
            'schemaVersion',
        ].forEach((name) => {
            Object.defineProperty(this, name, {get: util.getterForProperty(name)});
        });
    }

    addListener(name, callback) {
        if (typeof callback != 'function') {
            throw new Error('Realm.addListener must be passed a function!');
        }
        if (name != 'change') { 
            throw new Error("Only 'change' notification is supported.");
        }
        this[listenersKey].add(callback);
    }

    removeListener(name, callback) {
        if (typeof callback != 'function') {
            throw new Error('Realm.removeListener must be passed a function!');
        }
        if (name != 'change') { 
            throw new Error("Only 'change' notification is supported.");
        }
        this[listenersKey].delete(callback);
    }

    removeAllListeners(name) {
        if (name != undefined && name != 'change') {
            throw new Error("Only 'change' notification is supported.");
        }
        this[listenersKey].clear();
    }

    write(callback) {
        let realmId = this[keys.realm];

        if (!realmId) {
            throw new TypeError('write method was not called on a Realm object!');
        }
        if (typeof callback != 'function') {
            throw new TypeError('Realm.write() must be passed a function!');
        }

        rpc.beginTransaction(realmId);

        try {
            callback();
        } catch (e) {
            rpc.cancelTransaction(realmId);
            util.fireMutationListeners(realmId);
            throw e;
        }

        rpc.commitTransaction(realmId);

        this[listenersKey].forEach((cb) => cb(this, 'change'));
    }
}

// Non-mutating methods:
util.createMethods(Realm.prototype, objectTypes.REALM, [
    'close',
    'objects',
]);

// Mutating methods:
util.createMethods(Realm.prototype, objectTypes.REALM, [
    'create',
    'delete',
    'deleteAll',
], true);

Object.defineProperties(Realm, {
    Types: {
        value: Object.freeze(propTypes),
    },
    defaultPath: {
        get: util.getterForProperty('defaultPath'),
        set: util.setterForProperty('defaultPath'),
    },
    clearTestState: {
        value: function() {
            util.clearMutationListeners();
            rpc.clearTestState();
        },
    },
});

// The session ID refers to the Realm constructor object in the RPC server.
Realm[keys.id] = rpc.createSession();

module.exports = Realm;
