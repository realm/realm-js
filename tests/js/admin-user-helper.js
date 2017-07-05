'use strict';

let fs = require("fs");
let path = require("path");
var Realm = require('realm');

function random(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

exports.createAdminUser = function () {
    return new Promise((resolve, reject) => {
        const admin_token_user = Realm.Sync.User.adminUser(fs.readFileSync(path.join(__dirname, '../../object-server-for-testing/admin_token.base64'), 'utf-8'));



        let newAdminName = 'admin' + random(1, 100000);
        let password = '123';
        Realm.Sync.User.register('http://localhost:9080', newAdminName, password, (error, user) => {
            if (error) {
                reject(error);
            } else {
                const config = {
                    sync: {
                        user: admin_token_user,
                        url: `realm://localhost:9080/__admin`,
                        error: err => console.log('Error opening __admin realm ' + err),
                    }
                };

                Realm.open(config).then(realm => {
                    let pendingAdminUser = realm.objects('User').filtered(`id == "${user.identity}"`)[0];
                    realm.write(() => {
                        pendingAdminUser.isAdmin = true;
                    });

                    user.logout();
                }).then(_ => {
                    let waitForServerToUpdateAdminUser = function () {
                        Realm.Sync.User.login('http://localhost:9080', newAdminName, password, (error, user) => {
                            if (error) {
                                reject(error);
                            } else {
                                if (!user.isAdmin) {
                                    setTimeout(_ => {
                                        waitForServerToUpdateAdminUser();
                                    }, 200);
                                }

                                resolve({ 
                                    username: newAdminName, 
                                    password: password
                                });
                            }
                        });
                    }

                    setTimeout(_ => {
                        reject("admin-user-helper: Create admin user timeout");
                    }, 10000);

                    waitForServerToUpdateAdminUser();
                });
            }
        });
    });
}

