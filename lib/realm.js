'use strict';

let lists = require('./lists');
let objects = require('./objects');
let notifications = require('./notifications');
let results = require('./results');
let rpc = require('./rpc');
let types = require('./types');
let util = require('./util');

let realmKey = util.realmKey;
let notificationsKey = Symbol();
let notificationCallbackKey = Symbol();

// TODO: DATA
rpc.registerTypeConverter(types.DATE, (_, info) => new Date(info.value));
rpc.registerTypeConverter(types.LIST, lists.create);
rpc.registerTypeConverter(types.OBJECT, objects.create);
rpc.registerTypeConverter('ObjectTypesNOTIFICATION', notifications.create);
rpc.registerTypeConverter('ObjectTypesRESULTS', results.create);

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

        let realmId = this[realmKey] = rpc.createRealm(Array.from(arguments));

        objects.registerConstructors(realmId, constructors);

        this[notificationsKey] = [];
    }

    addNotification(callback) {
        let realmId = this[realmKey];

        if (!realmId) {
            throw new TypeError('addNotification method was not called on a Realm object!');
        }
        if (typeof callback != 'function') {
            throw new Error('Realm.addNotification must be passed a function!');
        }

        let notification = rpc.callRealmMethod(realmId, 'addNotification', [callback]);
        notification[notificationCallbackKey] = callback;

        this[notificationsKey].push(notification);
    }

    write(callback) {
        let realmId = this[realmKey];

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

        for (let notification of this[notificationsKey]) {
            let callback = notification[notificationCallbackKey];
            callback(this, 'DidChangeNotification');
        }
    }
}

[
    'close',
    'create',
    'delete',
    'deleteAll',
    'objects',
].forEach(function(name) {
    Object.defineProperty(Realm.prototype, name, {
        value: function() {
            let realmId = this[realmKey];

            if (!realmId) {
                throw new TypeError(name + ' method was not called on a Realm object!');
            }

            return rpc.callRealmMethod(realmId, name, Array.from(arguments));
        }
    });
});

Object.defineProperty(Realm, 'Types', {value: types});

Object.defineProperty(Realm, 'clearTestState', {
    value: function() {
        rpc.clearTestState();
    }
});

module.exports = Realm;
