'use strict';
const require_method = require;
function node_require(module) {
    return require_method(module);
}

const Realm = node_require('realm');

const adminName = "realm-admin"
const password = '';

exports.createAdminUser = function () {
    return Realm.Sync.User.login('http://localhost:9080', adminName, password).then((user) => {
        if (!user.isAdmin) {
            throw new Error(`${adminName} user is not an admin user on this server`);
        }

        return {
            username: adminName,
            password
        };
    });
}
