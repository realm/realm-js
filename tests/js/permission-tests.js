////////////////////////////////////////////////////////////////////////////
//
// Copyright 2017 Realm Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
////////////////////////////////////////////////////////////////////////////

'use strict';

var Realm = require('realm');
var TestCase = require('./asserts');

function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function createUsersWithTestRealms(count) {
    const createUserWithTestRealm = () => {
        return Realm.Sync.User
            .login('http://localhost:9080', Realm.Sync.Credentials.anonymous())
            .then(user => {
                new Realm({sync: {user, url: 'realm://localhost:9080/~/test', fullSynchronization: true }}).close();
                return user;
            });
    };

    return Promise.all(Array.from({length: count}, createUserWithTestRealm));
}

function wait(t) {
    return new Promise(resolve => setTimeout(resolve, t));
}

function repeatUntil(fn, predicate) {
    let retries = 0
    function check() {
        if (retries > 3) {
            return Promise.reject(new Error("operation timed out"));
        }
        ++retries;
        return fn().then(x => predicate(x) ? x : wait(100).then(check));
    }
    return check;
}

function subscribe(results) {
    const subscription = results.subscribe();
    return new Promise((resolve, reject) => {
        subscription.addListener((subscription, state) => {
            if (state === Realm.Sync.SubscriptionState.Complete) {
                resolve();
            }
            else if (state === Realm.Sync.SubscriptionState.Error) {
                reject();
            }
        });
        setTimeout(() => reject("listener never called"), 5000);
    });
}

function waitForUpload(realm) {
    let session = realm.syncSession;
    return new Promise(resolve => {
        let callback = (transferred, total) => {
            if (transferred === total) {
                session.removeProgressNotification(callback);
                resolve(realm);
            }
        };
        session.addProgressNotification('upload', 'forCurrentlyOutstandingWork', callback);
    });
}

function waitForDownload(realm) {
    let session = realm.syncSession;
    return new Promise(resolve => {
        let callback = (transferred, total) => {
            if (transferred === total) {
                session.removeProgressNotification(callback);
                resolve(realm);
            }
        };
        session.addProgressNotification('download', 'forCurrentlyOutstandingWork', callback);
    });
}

function permissionForPath(permissions, path) {
    for (const permission of permissions) {
        if (permission.path == path) {
            return permission;
        }
    }
}

const getPartialRealm = () => {
    const testID = uuid();
    return Realm.Sync.User
        .login('http://localhost:9080', Realm.Sync.Credentials.nickname("user-" + testID, true))
        .then(user => {
            const config = user.createConfiguration({
                sync: {
                    url: 'realm://localhost:9080/test_' + testID,
                    fullSynchronization: false,
                }
            });
            return Realm.open(config); // Creates the Realm on the server
        }).then(realm => {
            return waitForUpload(realm);
        }).then(realm => {
            return waitForDownload(realm);
        });
};

const assertFullAccess= function(permission) {
    TestCase.assertTrue(permission.canCreate);
    TestCase.assertTrue(permission.canRead);
    TestCase.assertTrue(permission.canUpdate);
    TestCase.assertTrue(permission.canDelete);
    TestCase.assertTrue(permission.canQuery);
    TestCase.assertTrue(permission.canModifySchema);
    TestCase.assertTrue(permission.canSetPermissions);
}

module.exports = {
    testApplyAndGetGrantedPermissions() {
        return createUsersWithTestRealms(1).then(([user]) => {
            const path = `/${user.identity}/test`;
            return user
                .applyPermissions({userId: `${user.identity}`},
                                  `/${user.identity}/test`, 'read')
                .then(repeatUntil(() => user.getGrantedPermissions('any'),
                                  permissions => {
                                      let permission = permissionForPath(permissions, path);
                                      return permission && !permission.mayWrite;
                                  }))
                .then(permissions => {
                    let permission = permissionForPath(permissions, path);
                    TestCase.assertDefined(permission);
                    TestCase.assertEqual(permission.mayRead, true);
                    TestCase.assertEqual(permission.mayWrite, false);
                    TestCase.assertEqual(permission.mayManage, false);
                });
        });
    },

    testOfferPermissions() {
        return createUsersWithTestRealms(2).then(([user1, user2]) => {
            const path = `/${user1.identity}/test`;
            return user1.offerPermissions(`/${user1.identity}/test`, 'read')
                .then(token => user2.acceptPermissionOffer(token))
                .then(realmUrl => {
                    TestCase.assertEqual(realmUrl, path);
                    return realmUrl;
                })
                .then(repeatUntil(() => user2.getGrantedPermissions('any'),
                                  permissions => permissions.length > 2
                                              && permissionForPath(permissions, path)))
                .then(permissions => {
                    let permission = permissionForPath(permissions, path)
                    TestCase.assertDefined(permission);
                    TestCase.assertEqual(permission.mayRead, true);
                    TestCase.assertEqual(permission.mayWrite, false);
                    TestCase.assertEqual(permission.mayManage, false);
                });
        });
    },

    testInvalidatePermissionOffer() {
        let user1, user2, token;
        return createUsersWithTestRealms(2)
            .then(users => {
                user1 = users[0];
                user2 = users[1];
                return user1.offerPermissions(`/${user1.identity}/test`, 'read');
            })
            .then(t => {
                token = t;
                return user1.invalidatePermissionOffer(token);
            })
            // Since we don't yet support notification when the invalidation has
            // gone through, wait for a bit and hope the server is done
            // processing.
            .then(() => wait(100))
            .then(() => user2.acceptPermissionOffer(token))
            // We want the call to fail, i.e. the catch() below should be
            // called.
            .then(() => {
                throw new Error("User was able to accept an invalid permission offer token");
            })
            .catch(error => {
                try {
                    TestCase.assertEqual(error.message, 'The permission offer is expired.');
                    TestCase.assertEqual(error.statusCode, 701);
                }
                catch (e) {
                    throw new Error(e);
                }
            });
    },

    testObjectPermissions() {
        let config = (user, url) => {
            return {
                schema: [
                    {
                        name: 'Object',
                        properties: {
                            value: 'int',
                            permissions: '__Permission[]'
                        }
                    },
                    Realm.Permissions.Permission,
                    Realm.Permissions.User,
                    Realm.Permissions.Role,
                ],
                sync: {user: user, url: url, fullSynchronization: false }
            };
        };
        let owner, otherUser
        return Realm.Sync.User
            .login('http://localhost:9080', Realm.Sync.Credentials.nickname(uuid()))
            .then(user => {
                owner = user;
                new Realm({sync: {user, url: 'realm://localhost:9080/default'}}).close();
                return Realm.Sync.User.login('http://localhost:9080', Realm.Sync.Credentials.nickname(uuid()))
            })
            .then((user) => {
                otherUser = user;
                let realm = new Realm(config(owner, 'realm://localhost:9080/default'));
                realm.write(() => {
                    let user = realm.create(Realm.Permissions.User, {id: otherUser.identity})
                    let role = realm.create(Realm.Permissions.Role, {name: 'reader'})
                    role.members.push(user)

                    let obj1 = realm.create('Object', {value: 1});
                    let obj2 = realm.create('Object', {value: 2});
                    obj2.permissions.push(realm.create(Realm.Permissions.Permission,
                                                       {role: role, canRead: true, canUpdate: false}))
                });
                return waitForUpload(realm).then(() => realm.close());
            })
            .then(() => Realm.open(config(otherUser, `realm://localhost:9080/default`)))
            .then((realm) => subscribe(realm.objects('Object')).then(() => realm))
            .then((realm) => {
                // Should have full access to the Realm as a whole
                TestCase.assertSimilar('object', realm.privileges(),
                                       {read: true, update: true, modifySchema: true, setPermissions: true});
                TestCase.assertSimilar('object', realm.privileges('Object'),
                                       {read: true, update: true, create: true, subscribe: true, setPermissions: true});
                // Verify that checking via constructor works too
                TestCase.assertSimilar('object', realm.privileges(Realm.Permissions.User),
                                       {read: true, update: true, create: true, subscribe: true, setPermissions: true});

                // Should only be able to see the second object
                let results = realm.objects('Object')
                TestCase.assertEqual(results.length, 1);
                TestCase.assertEqual(results[0].value, 2);
                TestCase.assertSimilar('object', realm.privileges(results[0]),
                                       {read: true, update: false, delete: false, setPermissions: false});
                realm.close();
            });
    },

    testAddPermissionSchemaForQueryBasedRealmOnly() {
        return new Promise((resolve, reject) => {
            Realm.Sync.User.register('http://localhost:9080', uuid(), 'password').then((user) => {
                let config = {
                    sync: {
                        user: user,
                        url: `realm://NO_SERVER/foo`,
                        fullSynchronization: false,
                    }
                };

                let realm = new Realm(config);
                TestCase.assertTrue(realm.empty);

                TestCase.assertEqual(realm.schema.length, 5);
                TestCase.assertEqual(realm.schema.filter(schema => schema.name === '__Class').length, 1);
                TestCase.assertEqual(realm.schema.filter(schema => schema.name === '__Permission').length, 1);
                TestCase.assertEqual(realm.schema.filter(schema => schema.name === '__Realm').length, 1);
                TestCase.assertEqual(realm.schema.filter(schema => schema.name === '__Role').length, 1);
                TestCase.assertEqual(realm.schema.filter(schema => schema.name === '__User').length, 1);

                realm.close();
                Realm.deleteFile(config);

                // Full sync shouldn't include the permission schema
                config = {
                    sync: {
                        user: user,
                        url: `realm://NO_SERVER/foo`,
                        fullSynchronization: true
                    }
                };
                realm = new Realm(config);
                TestCase.assertTrue(realm.empty);
                TestCase.assertEqual(realm.schema.length, 0);

                realm.close();
                Realm.deleteFile(config);

                resolve();
            }).catch(error => reject(error));
        });
    },

    testUsingAddedPermissionSchemas() {
        return new Promise((resolve, reject) => {
            Realm.Sync.User.register('http://localhost:9080', uuid(), 'password').then((user) => {
                const config = user.createConfiguration();
                const PrivateChatRoomSchema = {
                    name: 'PrivateChatRoom',
                    primaryKey: 'name',
                    properties: {
                        'name': { type: 'string', optional: false },
                        'permissions': { type: 'list', objectType: '__Permission' }
                    }
                };
                config.schema = [PrivateChatRoomSchema];
                const realm = new Realm(config);

                let rooms = realm.objects(PrivateChatRoomSchema.name);
                let subscription = rooms.subscribe();
                subscription.addListener((sub, state) => {
                    if (state === Realm.Sync.SubscriptionState.Complete) {
                        let roles = realm.objects(Realm.Permissions.Role).filtered(`name = '__User:${user.identity}'`);
                        TestCase.assertEqual(roles.length, 1);

                        realm.write(() => {
                            const permission = realm.create(Realm.Permissions.Permission,
                                { canUpdate: true, canRead: true, canQuery: true, role: roles[0] });

                            let room = realm.create(PrivateChatRoomSchema.name, { name: `#sales_${uuid()}` });
                            room.permissions.push(permission);
                        });

                        waitForUpload(realm).then(() => {
                            realm.close();
                            Realm.deleteFile(config);
                            // connecting with an empty schema should be possible, permission is added implicitly
                            Realm.open(user.createConfiguration()).then((realm) => {
                                return waitForUpload(realm);                                       
                            }).then((realm) => {
                                return waitForDownload(realm);
                            }).then((realm) => {
                                let permissions = realm.objects(Realm.Permissions.Permission).filtered(`role.name = '__User:${user.identity}'`);
                                TestCase.assertEqual(permissions.length, 1);
                                TestCase.assertTrue(permissions[0].canRead);
                                TestCase.assertTrue(permissions[0].canQuery);
                                TestCase.assertTrue(permissions[0].canUpdate);
                                TestCase.assertFalse(permissions[0].canDelete);
                                TestCase.assertFalse(permissions[0].canSetPermissions);
                                TestCase.assertFalse(permissions[0].canCreate);
                                TestCase.assertFalse(permissions[0].canModifySchema);
                                realm.close();
                                resolve();
                            });
                        });
                    }
                });
            }).catch(error => reject(error));
        });
    },

    testFindOrCreate_realmPermissions() {
        return getPartialRealm().then(realm => {
            return new Promise((resolve, reject) => {
                let realmPermissions = realm.permissions();
                TestCase.assertEqual(2, realm.objects('__Role').length); // [ "everyone", "__User:<xxx>" ]    
                realm.write(() => {
                    let permissions = realmPermissions.findOrCreate("foo");
                    TestCase.assertEqual("foo", permissions.role.name);
                    TestCase.assertEqual(0, permissions.role.members.length);
                    TestCase.assertFalse(permissions.canCreate);
                    TestCase.assertFalse(permissions.canRead);
                    TestCase.assertFalse(permissions.canUpdate);
                    TestCase.assertFalse(permissions.canDelete);
                    TestCase.assertFalse(permissions.canQuery);
                    TestCase.assertFalse(permissions.canModifySchema);
                    TestCase.assertFalse(permissions.canSetPermissions);
                    TestCase.assertEqual(3, realm.objects('__Role').length); // [ "everyone", "__User:<xxx>", "foo" ]    
                });
                resolve();
            });
        });
    },

    testFindOrCreate_existingRole() {
        return getPartialRealm().then(realm => {
            return new Promise((resolve, reject) => {
                realm.write(() => {
                    realm.create('__Role', {'name':'foo'});
                });
                TestCase.assertEqual(3, realm.objects('__Role').length); // [ "everyone", "__User:xxx", "foo" ]    

                let realmPermissions = realm.permissions();
                realm.write(() => {
                    let permissions = realmPermissions.findOrCreate("foo");
                    TestCase.assertEqual("foo", permissions.role.name);
                    TestCase.assertFalse(permissions.canCreate);
                    TestCase.assertFalse(permissions.canRead);
                    TestCase.assertFalse(permissions.canUpdate);
                    TestCase.assertFalse(permissions.canDelete);
                    TestCase.assertFalse(permissions.canQuery);
                    TestCase.assertFalse(permissions.canModifySchema);
                    TestCase.assertFalse(permissions.canSetPermissions);
                    TestCase.assertEqual(3, realm.objects('__Role').length); // [ "everyone", "__User:xxx", "foo" ]    
                });
                resolve();
            });
        });
    },

    testFindOrCreate_classPermissions() {
        return getPartialRealm().then(realm => {
            return new Promise((resolve, reject) => {
                let classPermissions = realm.permissions('__Class');
                TestCase.assertEqual(2, realm.objects('__Role').length); // [ "everyone", "__User:xxx" ]    
                realm.write(() => {
                    let permissions = classPermissions.findOrCreate("foo");
                    TestCase.assertEqual("foo", permissions.role.name);
                    TestCase.assertEqual(0, permissions.role.members.length);
                    TestCase.assertFalse(permissions.canCreate);
                    TestCase.assertFalse(permissions.canRead);
                    TestCase.assertFalse(permissions.canUpdate);
                    TestCase.assertFalse(permissions.canDelete);
                    TestCase.assertFalse(permissions.canQuery);
                    TestCase.assertFalse(permissions.canModifySchema);
                    TestCase.assertFalse(permissions.canSetPermissions);
                    TestCase.assertEqual(3, realm.objects('__Role').length); // [ "everyone", "__User:xxx", "foo" ]                   
                });
                resolve();
            });
        });
    },

    testFindOrCreate_throwsOutsideWrite() {
        return getPartialRealm().then(realm => {
            return new Promise((resolve, reject) => {
                let realmPermissions = realm.permissions();
                TestCase.assertThrows(() => realmPermissions.findOrCreate("foo"));
                let classPermissions = realm.permissions('__Class');
                TestCase.assertThrows(() => classPermissions.findOrCreate("foo"));
                resolve();
            });
        });
    },

    testPermissions_Realm: function() {
        return getPartialRealm().then(realm => {
            return new Promise((resolve, reject) => {
                let permissions = realm.permissions();
                TestCase.assertEqual(1, permissions.permissions.length);
                let perm = permissions.permissions[0];
                TestCase.assertEqual("everyone", perm.role.name);
                assertFullAccess(perm);
                resolve();
            });
        });
    },

    testPermissions_Class: function() {
        return getPartialRealm().then(realm => {
            return new Promise((resolve, reject) => {
                let permissions = realm.permissions('__Class');
                TestCase.assertEqual('__Class', permissions.name)
                TestCase.assertEqual(1, permissions.permissions.length);
                let perm = permissions.permissions[0];
                TestCase.assertEqual("everyone", perm.role.name);
                TestCase.assertTrue(perm.canCreate);
                TestCase.assertTrue(perm.canRead);
                TestCase.assertTrue(perm.canUpdate);
                TestCase.assertFalse(perm.canDelete);
                TestCase.assertTrue(perm.canQuery);
                TestCase.assertFalse(perm.canModifySchema);
                TestCase.assertTrue(perm.canSetPermissions);
                resolve();
            });
        });
    },

    testPermissions_Class_InvalidClassArgument: function() {
        return getPartialRealm().then(realm => {
            return new Promise((resolve, reject) => {
                TestCase.assertThrows(() => realm.permissions('foo'));
                resolve();
            });
        });
    },

};
