'use strict';
const require_method = require;
function node_require(module) {
    return require_method(module);
}

const Realm = node_require('realm');

const adminName = "realm-admin"
const password = '';

exports.createAdminUser = function () {
    const credentials = Realm.Sync.Credentials.usernamePassword(adminName, password);
    return Realm.Sync.User.login('http://localhost:9080', credentials).then((user) => {
        if (!user.isAdmin) {
            throw new Error(`${adminName} user is not an admin user on this server`);
        }

        return {
            username: adminName,
            password
        };
    });
}
