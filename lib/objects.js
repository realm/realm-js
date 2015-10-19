'use strict';

let keys = require('./keys');
let util = require('./util');

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
            get: util.getterForProperty(name),
            set: util.setterForProperty(name),
        };
    }

    Object.defineProperties(object, props);

    return object;
}

function registerConstructors(realmId, constructors) {
    registeredConstructors[realmId] = constructors;
}
