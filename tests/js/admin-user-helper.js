'use strict';
function node_require(module) {
    return require(module);
}

var Realm = node_require('realm');

const adminName = "realm-admin"
const password = '';

exports.createAdminUser = function () {
    return new Promise((resolve, reject) => {
        Realm.Sync.User.login('http://localhost:9080', adminName, password, (error, user) => {
            if (error) {
                reject(error);
                return;
            }
            
            if (!user.isAdmin) {
                reject(adminName + " user is not an admin user on this server");
            }

            resolve({
                username: adminName,
                password
            });
        });
    });
}
