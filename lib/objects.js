'use strict';

let keys = require('./keys');
let rpc = require('./rpc');

let registeredConstructors = {};

module.exports = {
    create,
    registerConstructors,
};

function create(realmId, info) {
    let schema = info.schema;
    let constructor = (registeredConstructors[realmId] || {})[schema.name];
    let object = constructor ? Object.create(constructor.prototype) : {};
    let props = {};

    object[keys.realm] = realmId;
    object[keys.id] = info.id;
    object[keys.type] = info.type;

    for (let prop of schema.properties) {
        let name = prop.name;

        props[name] = {
            get: getterForProperty(name),
            set: setterForProperty(name),
        };
    }

    Object.defineProperties(object, props);

    return object;
}

function registerConstructors(realmId, constructors) {
    registeredConstructors[realmId] = constructors;
}

function getterForProperty(name) {
    return function() {
        return rpc.getObjectProperty(this[keys.realm], this[keys.id], name);
    };
}

function setterForProperty(name) {
    return function(value) {
        rpc.setObjectProperty(this[keys.realm], this[keys.id], name, value);
    };
}
