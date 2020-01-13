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
var Utils = require('./test-utils');

function createUsersWithTestRealms(count) {
    const createUserWithTestRealm = () => {
        return Realm.Sync.User
            .login('http://127.0.0.1:9080', Realm.Sync.Credentials.anonymous())
            .then(user => {
                const realm = new Realm({sync: {user, url: 'realm://127.0.0.1:9080/~/test', fullSynchronization: true}});
                return realm.syncSession.uploadAllLocalChanges()
                    .then(() => {
                        return user;
                    });
            });
    };

    return Promise.all(Array.from({length: count}, createUserWithTestRealm));
}

function wait(t) {
    return new Promise(resolve => setTimeout(resolve, t));
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
    return realm.syncSession.uploadAllLocalChanges().then(() => realm);
}

function waitForDownload(realm) {
    return realm.syncSession.downloadAllServerChanges().then(() => realm);
}

function permissionForPath(permissions, path) {
    for (const permission of permissions) {
        if (permission.path == path) {
            return permission;
        }
    }
}

const getPartialRealm = () => {
    const testID = Utils.uuid();

    if (!global.testAdminUserInfo) {
        throw new Error("Test requires an admin user");
    }

    return Realm.Sync.User
        .login('http://127.0.0.1:9080', Realm.Sync.Credentials.usernamePassword(global.testAdminUserInfo.username, global.testAdminUserInfo.password))
        .then(user => {
            const config = user.createConfiguration({
                sync: {
                    url: 'realm://127.0.0.1:9080/test_' + testID,
                    fullSynchronization: false,
                }
            });
            return Realm.open(config); // Creates the Realm on the server
        })
        .then(waitForUpload)
        .then(waitForDownload)
};

const assertFullAccess = function(permission) {
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
                .then(() => {
                    return user.getGrantedPermissions('any');
                })
                .then(permissions => {
                    let permission = permissionForPath(permissions, path);
                    TestCase.assertDefined(permission);
                    TestCase.assertEqual(permission.accessLevel, 'read');
                    TestCase.assertEqual(permission.mayRead, true);
                    TestCase.assertEqual(permission.mayWrite, false);
                    TestCase.assertEqual(permission.mayManage, false);
                });
        });
    },

    async testOfferPermissions() {
        const [user1, user2] = await createUsersWithTestRealms(2);
        const path = `/${user1.identity}/test`;
        const token = await user1.offerPermissions(`/${user1.identity}/test`, 'read');
        const realmUrl = await user2.acceptPermissionOffer(token);
        TestCase.assertEqual(realmUrl, path);

        let permission;
        for (let i = 0; !permission && i < 3; ++i) {
            permission = await permissionForPath(await user2.getGrantedPermissions('any'), path);
            if (!permission) {
                await wait(100 * (i + 1));
            }
        }

        TestCase.assertDefined(permission);
        TestCase.assertEqual(permission.mayRead, true);
        TestCase.assertEqual(permission.mayWrite, false);
        TestCase.assertEqual(permission.mayManage, false);
    },

    async testInvalidatePermissionOffer() {
        const [user1, user2] = await createUsersWithTestRealms(2);
        const token = await user1.offerPermissions(`/${user1.identity}/test`, 'read');
        await user1.invalidatePermissionOffer(token);
        // Since we don't yet support notification when the invalidation has
        // gone through, wait for a bit and hope the server is done
        // processing.
        await wait(100);
        try {
            await user2.acceptPermissionOffer(token);
        }
        catch (error) {
            TestCase.assertEqual(error.message, 'The permission offer is expired.');
            TestCase.assertEqual(error.code, 701);
            return;
        }
        throw new Error("User was able to accept an invalid permission offer token");
    },

    async testGetPermissionOffers() {
        const [user] = await createUsersWithTestRealms(1);
        const tokenRead = await user.offerPermissions(`/${user.identity}/test`, 'read');
        const tokenWrite = await user.offerPermissions(`/${user.identity}/test`, 'write');

        const offers = await user.getPermissionOffers();
        TestCase.assertEqual(offers.length, 2);

        await user.invalidatePermissionOffer(tokenRead);

        const offersAfterDeletion = await user.getPermissionOffers();
        TestCase.assertEqual(offersAfterDeletion.length, 1);
        TestCase.assertEqual(offersAfterDeletion[0].token, tokenWrite);
    },

    // FIXME: enable this test
    /*
    async testObjectPermissions() {
        if (!global.testAdminUserInfo) {
            throw new Error("Test requires an admin user");
        }

        const realmUrl = `realm://127.0.0.1:9080/testObjectPermissions_${Utils.uuid()}`
        let config = (user) => {
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
                sync: {user, url: realmUrl, fullSynchronization: false}
            };
        };
        const owner = await Realm.Sync.User.login('http://127.0.0.1:9080', Realm.Sync.Credentials.usernamePassword(global.testAdminUserInfo.username, global.testAdminUserInfo.password));
        const otherUser = await Realm.Sync.User.login('http://127.0.0.1:9080', Realm.Sync.Credentials.nickname(Utils.uuid()));

        const ownerRealm = new Realm(config(owner));
        ownerRealm.write(() => {
            let user = ownerRealm.create(Realm.Permissions.User, {id: otherUser.identity})
            let role = ownerRealm.create(Realm.Permissions.Role, {name: 'reader'})
            role.members.push(user)

            let obj1 = ownerRealm.create('Object', {value: 1});
            let obj2 = ownerRealm.create('Object', {value: 2});
            obj2.permissions.push(ownerRealm.create(Realm.Permissions.Permission,
                                                    {role: role, canRead: true, canUpdate: false}))
        });
        await ownerRealm.syncSession.uploadAllLocalChanges();
        ownerRealm.close();

        const realm = await Realm.open(config(otherUser));
        await subscribe(realm.objects('Object'));

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
    },
    */

    testAddPermissionSchemaForQueryBasedRealmOnly() {
        return Realm.Sync.User.register('http://127.0.0.1:9080', Utils.uuid(), 'password').then((user) => {
            let config = {
                schema: [],
                sync: {
                    user: user,
                    url: `realm://NO_SERVER/foo`,
                    fullSynchronization: false,
                }
            };

            let realm = new Realm(config);
            TestCase.assertTrue(realm.empty);

            TestCase.assertEqual(realm.schema.length, 5 + 1); // 5 = see below, 1 = __ResultSets
            TestCase.assertEqual(realm.schema.filter(schema => schema.name === '__Class').length, 1);
            TestCase.assertEqual(realm.schema.filter(schema => schema.name === '__Permission').length, 1);
            TestCase.assertEqual(realm.schema.filter(schema => schema.name === '__Realm').length, 1);
            TestCase.assertEqual(realm.schema.filter(schema => schema.name === '__Role').length, 1);
            TestCase.assertEqual(realm.schema.filter(schema => schema.name === '__User').length, 1);

            realm.close();
            Realm.deleteFile(config);

            // Full sync shouldn't include the permission schema
            config = {
                schema: [],
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
        });
    },

    // FIXME: enable this test
    /*
    testUsingAddedPermissionSchemas() {
        const PrivateChatRoomSchema = {
            name: 'PrivateChatRoom',
            primaryKey: 'name',
            properties: {
                'name': { type: 'string', optional: false },
                'permissions': { type: 'list', objectType: '__Permission' }
            }
        };

        return Realm.Sync.User.register('http://127.0.0.1:9080', Utils.uuid(), 'password').then((user) => {
            const config = user.createConfiguration({
                schema: [PrivateChatRoomSchema],
                sync: {
                    _sessionStopPolicy: 'immediately'
                },
            });
            const realm = new Realm(config);

            let rooms = realm.objects(PrivateChatRoomSchema.name);
            let subscription = rooms.subscribe();
            return new Promise((resolve, reject) => {
                const callback = (sub, state) => {
                    if (state !== Realm.Sync.SubscriptionState.Complete) {
                        return;
                    }
                    sub.removeListener(callback);
                    resolve(realm);
                };
                subscription.addListener(callback);
            })
        })
        .then(realm => {
            let roles = realm.objects(Realm.Permissions.Role).filtered(`name = '__User:${realm.syncSession.user.identity}'`);
            TestCase.assertEqual(roles.length, 1);

            realm.write(() => {
                const permission = realm.create(Realm.Permissions.Permission,
                    { canUpdate: true, canRead: true, canQuery: true, role: roles[0] });

                let room = realm.create(PrivateChatRoomSchema.name, { name: `#sales_${Utils.uuid()}` });
                room.permissions.push(permission);
            });

            return waitForUpload(realm);
        })
        .then(realm => {
            const user = realm.syncSession.user;
            const config = user.createConfiguration();
            realm.close();
            Realm.deleteFile(config);
            // connecting with an empty schema should be possible, permission is added implicitly
            return Realm.open(config);
        })
        .then(realm => {
            let permissions = realm.objects(Realm.Permissions.Permission).filtered(`role.name = '__User:${realm.syncSession.user.identity}'`);
            TestCase.assertEqual(permissions.length, 1);
            TestCase.assertTrue(permissions[0].canRead);
            TestCase.assertTrue(permissions[0].canQuery);
            TestCase.assertTrue(permissions[0].canUpdate);
            TestCase.assertFalse(permissions[0].canDelete);
            TestCase.assertFalse(permissions[0].canSetPermissions);
            TestCase.assertFalse(permissions[0].canCreate);
            TestCase.assertFalse(permissions[0].canModifySchema);
            realm.close();
        });
    },
    */

    // FIXME: enable this test
    /*
    testFindOrCreate_realmPermissions() {
        return getPartialRealm().then(realm => {
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
        });
    },
    */

    // FIXME: enable this test
    /*
    testFindOrCreate_existingRole() {
        return getPartialRealm().then(realm => {
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
        });
    },
    */

    // FIXME: enable this test
    /*
    testFindOrCreate_classPermissions() {
        return getPartialRealm().then(realm => {
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
        });
    },
    */

    testFindOrCreate_throwsOutsideWrite() {
        return getPartialRealm().then(realm => {
            let realmPermissions = realm.permissions();
            TestCase.assertThrows(() => realmPermissions.findOrCreate("foo"));
            let classPermissions = realm.permissions('__Class');
            TestCase.assertThrows(() => classPermissions.findOrCreate("foo"));
        });
    },

    testPermissions_Realm: function() {
        return getPartialRealm().then(realm => {
            let permissions = realm.permissions();
            TestCase.assertEqual(1, permissions.permissions.length);
            let perm = permissions.permissions[0];
            TestCase.assertEqual("everyone", perm.role.name);
            assertFullAccess(perm);
        });
    },

    testPermissions_Class: function() {
        return getPartialRealm().then(realm => {
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
        });
    },

    testPermissions_Class_InvalidClassArgument: function() {
        return getPartialRealm().then(realm => {
            TestCase.assertThrows(() => realm.permissions('foo'));
        });
    },

};
