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
    return Realm.Sync.User.login('http://127.0.0.1:9080', credentials).then((user) => {
        if (!user.isAdmin) {
            throw new Error(`${adminName} user is not an admin user on this server`);
        }

        return {
            username: adminName,
            password
        };
    });
}

const isNodeProcess = typeof process === 'object' && process + '' === '[object process]';
let fs, jwt, rosDataDir;
if (isNodeProcess) {
    fs = node_require('fs');
    jwt = node_require('jsonwebtoken');
    rosDataDir = process.env.ROS_DATA_DIR || '../realm-object-server-data';
}

exports.loginAdminUser = function () {
    const adminToken = JSON.parse(fs.readFileSync(`${rosDataDir}/keys/admin.json`, 'utf8'))['ADMIN_TOKEN'];
    const credentials = Realm.Sync.Credentials.adminToken(adminToken);
    return Realm.Sync.User.login('http://127.0.0.1:9080', credentials);
}
