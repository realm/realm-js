'use strict';

let util = require('./util');

let idKey = util.idKey;
let realmKey = util.realmKey;

exports.create = create;

function create(realmId, info) {
    let notification = new Notification();

    notification[realmKey] = realmId;
    notification[idKey] = info.id;

    return notification;
}

class Notification {}
