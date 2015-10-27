'use strict';

const constants = require('./constants');
const lists = require('./lists');
const objects = require('./objects');
const results = require('./results');
const rpc = require('./rpc');
const util = require('./util');

const {keys, propTypes, objectTypes} = constants;
const notificationsKey = Symbol();
const resultsKey = Symbol();

// TODO: DATA
rpc.registerTypeConverter(propTypes.DATE, (_, info) => new Date(info.value));
rpc.registerTypeConverter(propTypes.LIST, lists.create);
rpc.registerTypeConverter(propTypes.OBJECT, objects.create);
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
        this[notificationsKey] = [];
        this[resultsKey] = [];

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
        this[notificationsKey].push(callback);
    }


    removeListener(name, callback) {
        if (typeof callback != 'function') {
            throw new Error('Realm.addListener must be passed a function!');
        }
        if (name != 'change') { 
            throw new Error("Only 'change' notification is supported.");
        }
        var index = 0;
        while((index = this[notificationsKey].indexOf(callback, index)) != -1) {
            this[notificationsKey].splice(index, 1);
        };
    }

    removeAllListeners(name) {
        if (name != undefined && name != 'change') { 
            throw new Error("Only 'change' notification is supported.");
        }
        this[notificationsKey] = [];
    }

    objects() {
        let method = util.createMethod(objectTypes.REALM, 'objects');
        let results = method.apply(this, arguments);

        this[resultsKey].push(results);
        return results;
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
            throw e;
        }

        rpc.commitTransaction(realmId);

        for (let results of this[resultsKey]) {
            results[keys.resize]();
        }

        for (let callback of this[notificationsKey]) {
            callback(this, 'change');
        }
    }
}

util.createMethods(Realm.prototype, objectTypes.REALM, [
    'close',
    'create',
    'delete',
    'deleteAll',
]);

Object.defineProperties(Realm, {
    Types: {
        value: Object.freeze(propTypes),
    },
    defaultPath: {
        get: util.getterForProperty('defaultPath'),
        set: util.setterForProperty('defaultPath'),
    },
    clearTestState: {
        value: rpc.clearTestState,
    },
});

// The session ID refers to the Realm constructor object in the RPC server.
Realm[keys.id] = rpc.createSession();

module.exports = Realm;
