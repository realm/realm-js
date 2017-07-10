'use strict';
function node_require(module) { 
    return require(module); 

}
let fs = node_require("fs");
let path = node_require("path");
var Realm = node_require('realm');

function random(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

exports.createAdminUser = function () {
    return new Promise((resolve, reject) => {
        let isAdminRetryCounter = 0;
        let newAdminName = 'admin' + random(1, 100000);
        let password = '123';
        Realm.Sync.User.register('http://localhost:9080', newAdminName, password, (error, user) => {
            if (error) {
                reject(error);
            } else {  
                let userIdentity = user.identity;
                user.logout();

                let admin_token_user = Realm.Sync.User.adminUser(fs.readFileSync(path.join(__dirname, '/../../object-server-for-testing/admin_token.base64'), 'utf-8'));                

                const config = {
                    sync: {
                        user: admin_token_user,
                        url: `realm://localhost:9080/__admin`,
                        error: err =>
                         console.log('Error opening __admin realm ' + err.user  + ' ' + err.url + ' ' + err.state),
                    }
                };

                Realm.open(config).then(realm => {
                    let pendingAdminUser = realm.objectForPrimaryKey('User', userIdentity);
                    realm.write(() => {
                        pendingAdminUser.isAdmin = true;
                    });

                    admin_token_user.logout();
                }).then(() => {
                    let waitForServerToUpdateAdminUser = function () {
                        isAdminRetryCounter++;
                        if (isAdminRetryCounter > 10) {
                            reject("admin-user-helper: Create admin user timeout");
                            return;
                        }

                        Realm.Sync.User.login('http://localhost:9080', newAdminName, password, (error, newAdminUser) => {
                            if (error) {
                                reject(error);
                            } else {
                                let isAdmin = newAdminUser.isAdmin;
                                user.logout();
                                if (!isAdmin) {
                                    setTimeout(waitForServerToUpdateAdminUser, 500);
                                    return;
                                }

                                resolve({ 
                                    username: newAdminName, 
                                    password
                                });
                            }
                        });
                    }

                    waitForServerToUpdateAdminUser();
                });
            }
        });
    });
}

