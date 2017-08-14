'use strict';
function node_require(module) {
    return require(module);

}
let fs = node_require("fs");
let path = node_require("path");
var Realm = node_require('realm');

function getObjectServerPath() {
  const pathParts = __dirname.split(path.sep);
  let objectServerPath;
  for(let p = pathParts.length; p >= 0; p--) {
    const candidatePathParts = pathParts.slice(0, p);
    candidatePathParts.push("object-server-for-testing");
    const candidatePath = candidatePathParts.join(path.sep);
    if (fs.existsSync(candidatePath)) {
      return candidatePath;
    }
  }
  return null;
}

function getAdminToken() {
  const objectServerPath = getObjectServerPath();
  if(objectServerPath) {
    const accessTokenPath = path.resolve(objectServerPath, "admin_token.base64");
    if(fs.existsSync(accessTokenPath)) {
      return fs.readFileSync(accessTokenPath, "utf-8");
    } else {
      throw new Error("Couldn´t locate the admin token, used to access the realm object server.");
    }
  } else {
    throw new Error("Couldn´t locate the realm object server.");
  }
}

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

                let admin_token_user = Realm.Sync.User.adminUser(getAdminToken());

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
