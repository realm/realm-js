'use strict';

let lists = require('./lists');
let objects = require('./objects');
let rpc = require('./rpc');
let types = require('./types');

let realmKey = Symbol();

// TODO: DATA
rpc.registerTypeConverter(types.DATE, (_, info) => new Date(info.value));
rpc.registerTypeConverter(types.LIST, lists.create);
rpc.registerTypeConverter(types.OBJECT, objects.create);

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
        
        let realmId = this[realmKey] = rpc.createRealm(config);
        
        objects.registerConstructors(realmId, constructors);
    }

    addNotification(callback) {
        // TODO
    }

    create(type, values) {
        let realmId = this[realmKey];
        let info = rpc.createObject(realmId, type, values);

        return objects.create(realmId, info);
    }
    
    delete(object) {
        // TODO
    }
    
    deleteAll() {
        // TODO
    }

    objects(type) {
        // TODO
    }

    write(callback) {
        if (typeof callback != 'function')
            throw new TypeError('Realm.write() must be passed a function!');
        
        rpc.beginTransaction(this[realmKey]);
        
        try {
            callback();
        } catch (e) {
            rpc.cancelTransaction(this[realmKey]);
            throw e;
        }
        
        rpc.commitTransaction(this[realmKey]);
    }
}

Object.defineProperty(Realm, 'Types', {value: types});

module.exports = Realm;
