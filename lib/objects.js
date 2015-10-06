'use strict';

let rpc = require('./rpc');

let idKey = Symbol();
let realmKey = Symbol();
let schemaKey = Symbol();
let registeredconstructors = {};

exports.create = create;
exports.registerconstructors = registerconstructors;

function create(realmId, info) {
    let schema = info.schema;
    let constructor = (registeredconstructors[realmId] || {})[schema.name];
    let object = constructor ? Object.create(constructor.prototype) : {};
    let props = {};

    object[realmKey] = realmId;
    object[idKey] = info.id;
    object[schemaKey] = schema;

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

function registerconstructors(realmId, constructors) {
    registeredconstructors[realmId] = constructors;
}

function getterForProperty(name) {
    return function() {
        let realmId = this[realmKey];
        return rpc.getObjectProperty(realmId, this[idKey], name);
    };
}

function setterForProperty(name) {
    return function(value) {
        rpc.setObjectProperty(this[realmKey], this[idKey], name, value);
    };
}