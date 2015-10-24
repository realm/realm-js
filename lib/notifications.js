'use strict';

const constants = require('./constants');

const {keys} = constants;

module.exports = {
    create,
};

class Notification {}

function create(realmId, info) {
    let notification = new Notification();

    notification[keys.realm] = realmId;
    notification[keys.id] = info.id;
    notification[keys.type] = info.type;

    return notification;
}
