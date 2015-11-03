/* Copyright 2015 Realm Inc - All Rights Reserved
 * Proprietary and Confidential
 */

'use strict';

const constants = require('./constants');
const util = require('./util');

const {keys} = constants;
const registeredConstructors = {};

module.exports = {
    create,
    registerConstructors,
};

function create(realmId, info) {
    let schema = info.schema;
    let constructor = (registeredConstructors[realmId] || {})[schema.name];
    let object = constructor ? Object.create(constructor.prototype) : {};

    object[keys.realm] = realmId;
    object[keys.id] = info.id;
    object[keys.type] = info.type;

    schema.properties.forEach((name) => {
        Object.defineProperty(object, name, {
            enumerable: true,
            get: util.getterForProperty(name),
            set: util.setterForProperty(name),
        });
    });

    return object;
}

function registerConstructors(realmId, constructors) {
    registeredConstructors[realmId] = constructors;
}
