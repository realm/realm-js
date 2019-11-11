////////////////////////////////////////////////////////////////////////////
//
// Copyright 2019 Realm Inc.
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

/* eslint-env es6, node */

'use strict';

const Realm = require('realm');
const TestCase = require('./asserts');
const schemas = require('./schemas');
const Utils = require('./test-utils');

function getRealm() {
    const AUTH_URL = 'http://127.0.0.1:9080';
    const REALM_URL = 'realm://127.0.0.1:9080/~/' + Utils.uuid().replace("-", "_");
    return Realm.Sync.User.login(AUTH_URL, Realm.Sync.Credentials.nickname("admin", true))
        .then((user) => {
            const schemas = [
                {
                    name: 'Parent',
                    properties: {
                        name: { type: 'string' },
                        child: 'ObjectA',
                    }
                },
                {
                    name: 'ObjectA',
                    properties: {
                        name: { type: 'string' },
                        parents: { type: 'linkingObjects', objectType: 'Parent', property: 'child' },
                    }
                },
            ];

            const config = user.createConfiguration({
                schema: schemas,
                sync: {
                    url: REALM_URL,
                }
            });
            // FIXME: Is this change needed with core 6 as Realm instance caching is removed in object store?
            return Realm.open(config);
    });
}

function pendingOrComplete(state) {
    return state === Realm.Sync.SubscriptionState.Pending || state === Realm.Sync.SubscriptionState.Complete;
}

function verifySubscriptionWithParents(parentToInclude, filterClause) {
    return getRealm().then(realm => {
        realm.write(() => {
            let obj_a1 = realm.create('ObjectA', {name: "a1"});
            let obj_a2 = realm.create('ObjectA', {name: "a2"});
            let parent_1 = realm.create('Parent', {name: "p1", child: obj_a1});
            let parent_2 = realm.create('Parent', {name: "p2", child: obj_a1});
            let parent_3 = realm.create('Parent', {name: "p3"});
        });
        let a_objects = realm.objects('ObjectA');
        TestCase.assertEqual(a_objects.length, 2);
        TestCase.assertEqual(a_objects[0].parents.length, 2);
        TestCase.assertEqual(a_objects[1].parents.length, 0);
        return new Promise((resolve, reject) => {
            if (!filterClause) {
                filterClause = "TRUEPREDICATE";
            }
            const query = realm.objects("ObjectA").filtered(filterClause);
            let listOfInclusionPropertyPaths = [];
            if (parentToInclude) {
                listOfInclusionPropertyPaths.push(parentToInclude);
            }
            let subscriptionOptions = {
                includeLinkingObjects: listOfInclusionPropertyPaths,
            };
            const sub = query.subscribe(subscriptionOptions);
            const desc = sub.query;
            sub.addListener((subscription, state) => {
                if (state === Realm.Sync.SubscriptionState.Complete) {
                    sub.removeAllListeners();
                    let a_objects = realm.objects('ObjectA').sorted("name");
                    let parent_objects = realm.objects('Parent').sorted("name");
                    // one object is not linked to and therefore not included in the subscription
                    TestCase.assertEqual(a_objects.length, 2);
                    TestCase.assertEqual(parent_objects.length, 2);
                    TestCase.assertEqual(a_objects[0].name, "a1");
                    TestCase.assertEqual(a_objects[1].name, "a2");
                    TestCase.assertEqual(parent_objects[0].name, "p1");
                    TestCase.assertEqual(parent_objects[1].name, "p2");
                    TestCase.assertNotEqual(parent_objects[0].child, null);
                    TestCase.assertNotEqual(parent_objects[1].child, null);
                    TestCase.assertEqual(parent_objects[0].child.name, a_objects[0].name);
                    TestCase.assertEqual(parent_objects[1].child.name, a_objects[0].name);
                    resolve();
                }
                else if (state === Realm.Sync.SubscriptionState.Error) {
                    reject(subscription.error);
                }
            });
        });
    });
}

module.exports = {

    testSubscriptionWrapperProperties() {
        return getRealm().then(realm => {
            const subscription = realm.objects("ObjectA").subscribe("test");
            TestCase.assertEqual(subscription.name, "test");
            TestCase.assertEqual(subscription.state, Realm.Sync.SubscriptionState.Creating);
        });
    },

    testNamedSubscriptionProperties() {
        return getRealm().then(realm => {
            return new Promise((resolve, reject) => {
                const now = new Date();
                const now_plus_2_sec = new Date(now.getTime() + 2000);
                const sub = realm.objects("ObjectA").subscribe("named-test");
                sub.addListener((subscription, state) => {
                    if (pendingOrComplete(state)) {
                        sub.removeAllListeners();
                        const namedSub = realm.subscriptions("named-test")[0];
                        TestCase.assertEqual(namedSub.name, "named-test");
                        TestCase.assertTrue(pendingOrComplete(namedSub.state));
                        TestCase.assertEqual(namedSub.error, undefined);
                        TestCase.assertEqual(namedSub.objectType, "ObjectA");
                        TestCase.assertTrue(namedSub.createdAt.getTime() >= now.getTime() && namedSub.createdAt.getTime() < now_plus_2_sec.getTime());
                        TestCase.assertEqual(namedSub.updatedAt.getTime(), namedSub.createdAt.getTime());
                        TestCase.assertEqual(namedSub.expiresAt, null);
                        TestCase.assertEqual(namedSub.timeToLive, null);
                        resolve();
                    }
                });
            });
        });
    },

    testUpdateQuery: function () {
        return getRealm().then(realm => {
            return new Promise((resolve, reject) => {
                const sub = realm.objects("ObjectA").filtered("name = 'Foo'").subscribe("update-named-sub-query");
                sub.addListener((subscription, state) => {
                    if (state === Realm.Sync.SubscriptionState.Complete) {
                        sub.removeAllListeners();
                        const namedSub = realm.subscriptions("update-named-sub-query")[0];
                        let updated = namedSub.updatedAt;
                        setTimeout(function() {
                            realm.beginTransaction();

                            // Updating the query must either be a string or a Results objects
                            TestCase.assertThrows(() => namedSub.query = 0);
                            TestCase.assertThrows(() => namedSub.query = true);

                            // Updating the query using a string
                            namedSub.query = "truepredicate";
                            TestCase.assertEqual(namedSub.query, "truepredicate");
                            TestCase.assertTrue(pendingOrComplete(namedSub.state));
                            TestCase.assertEqual(namedSub.error, undefined);
                            TestCase.assertTrue(updated.getTime() < namedSub.updatedAt.getTime());
                            updated = namedSub.updatedAt;

                            setTimeout(function() {
                                // Updating the query using a Results object
                                namedSub.query = realm.objects('ObjectA').filtered('name = "Bar"');
                                TestCase.assertTrue(updated.getTime() < namedSub.updatedAt.getTime());

                                realm.commitTransaction();
                                resolve();
                            }, 1000);
                        }, 1000);
                    }
                });
            });
        });
    },

    testUpdateTtl() {
        return getRealm().then(realm => {
            const sub = realm.objects("ObjectA").filtered("name = 'Foo'").subscribe("update-named-sub-query");
            return new Promise((resolve, reject) => {
                sub.addListener((subscription, state) => {
                    if (pendingOrComplete(state)) {
                        sub.removeAllListeners();
                        const namedSub = realm.subscriptions("update-named-sub-query")[0];
                        let updated = namedSub.updatedAt;

                        realm.beginTransaction();
                        TestCase.assertEqual(namedSub.expiresAt, null);
                        namedSub.timeToLive = 1000;
                        TestCase.assertEqual(namedSub.timeToLive, 1000);
                        TestCase.assertTrue(updated.getTime() < namedSub.updatedAt.getTime());
                        TestCase.assertTrue(namedSub.expiresAt.getTime() < new Date().getTime() + 2000);
                        realm.commitTransaction();

                        resolve();
                    }
                });
            });
        });
    },

    testUpdateReadOnlyProperties() {
        return getRealm().then(realm => {
            return new Promise((resolve, reject) => {
                const sub = realm.objects("ObjectA").subscribe("read-only-test");
                sub.addListener((subscription, state) => {
                    if (pendingOrComplete(state)) {
                        sub.removeAllListeners();
                        const namedSub = realm.subscriptions("read-only-test")[0];
                        TestCase.assertThrows(() => namedSub.name = "Foo");
                        TestCase.assertThrows(() => namedSub.createdAt = new Date());
                        TestCase.assertThrows(() => namedSub.updatedAt = new Date());
                        TestCase.assertThrows(() => namedSub.expiresAt = new Date());
                        TestCase.assertThrows(() => namedSub.state = 100);
                        TestCase.assertThrows(() => namedSub.error = "boom");
                        resolve();
                    }
                });
            });
        });
    },

    testSubscribeWithTtl() {
        return getRealm().then(realm => {
            return new Promise((resolve, reject) => {
                const now = new Date();
                const now_plus_2_sec = new Date(now.getTime() + 2000);
                const query = realm.objects("ObjectA");
                const sub = query.subscribe({ name: "with-ttl", timeToLive: 1000});
                sub.addListener((subscription, state) => {
                    if (pendingOrComplete(state)) {
                        sub.removeAllListeners();
                        const namedSub = realm.subscriptions("with-ttl")[0];
                        TestCase.assertTrue(now.getTime() <= namedSub.createdAt.getTime() && namedSub.createdAt.getTime() < now_plus_2_sec.getTime());
                        TestCase.assertEqual(namedSub.updatedAt.getTime(), namedSub.createdAt.getTime());
                        TestCase.assertTrue(namedSub.expiresAt.getTime() < now_plus_2_sec.getTime());
                        TestCase.assertEqual(namedSub.timeToLive, 1000);
                        resolve();
                    }
                });
            });
        });
    },

    testSubscribeAndUpdateQuery() {
        return getRealm().then(realm => {
            return new Promise((resolve, reject) => {
                let query1 = realm.objects("ObjectA");
                const sub1 = query1.subscribe("update-query");
                sub1.addListener((subscription1, state1) => {
                    if (pendingOrComplete(state1)) {
                        sub1.removeAllListeners();
                        const namedSub = realm.subscriptions("update-query")[0];
                        const update1 = namedSub.updatedAt;
                        setTimeout(function() {
                            let query2 = realm.objects('ObjectA').filtered("name = 'Foo'");
                            const sub2 = query2.subscribe({name: 'update-query', update: true});
                            sub2.addListener((subscription2, state2) => {
                                if (pendingOrComplete(state2)) {
                                    sub2.removeAllListeners();
                                    TestCase.assertFalse(query1.description() === query2.description(), "'description()' was not updated.");
                                    TestCase.assertTrue(update1.getTime() < namedSub.updatedAt.getTime(), "'updatedAt' was not correctly updated.");
                                    resolve();
                                }
                            });
                        }, 2000);
                    }
                });
            });
        });
    },

    testSubscribeAndUpdateTtl() {
        return getRealm().then(realm => {
            const query1 = realm.objects("ObjectA");

            return new Promise((resolve, reject) => {
                const sub1 = query1.subscribe({name: "update-query", timeToLive: 1000});
                sub1.addListener((subscription1, state1) => {
                    if (pendingOrComplete(state1)) {
                        sub1.removeAllListeners();
                        const namedSub = realm.subscriptions("update-query")[0];
                        const update1 = namedSub.updatedAt;
                        const expires1 = namedSub.expiresAt;
                        const queryDescription = namedSub.query;
                        setTimeout(function() {
                            const sub2 = query1.subscribe({name: 'update-query', update: true, timeToLive: 5000});
                            sub2.addListener((subscription2, state2) => {
                                if (pendingOrComplete(state2) && namedSub.timeToLive === 5000) {
                                    sub2.removeAllListeners();
                                    TestCase.assertTrue(update1.getTime() < namedSub.updatedAt.getTime(), "'updatedAt' was not updated correctly.");
                                    TestCase.assertTrue(expires1.getTime() < namedSub.expiresAt.getTime(), "'expiresAt' was not updated correctly.");
                                    TestCase.assertEqual(namedSub.timeToLive, 5000, "'timeToLive' was not updated correctly.");
                                    TestCase.assertTrue(queryDescription === namedSub.query, "'query' was not updated correctly.");
                                    resolve();
                                }
                            });
                        }, 2000);
                    }
                });
            });
        });
    },

    testSubscribeWithoutName() {
        return getRealm().then(realm => {
            let query = realm.objects("ObjectA");
            query.subscribe({ update: true, timeToLive: 1000}); // Missing name, doesn't throw
        });
    },

    testSubscribeWithMisspelledConfigParameter() {
        return getRealm().then(realm => {
            let query = realm.objects("ObjectA");
            TestCase.assertThrowsContaining(() => query.subscribe({ naem: "myName" }), "Unexpected property in subscription options: 'naem'");
        });
    },

    testSubscribeToChildrenWithoutParents() {
        return getRealm().then(realm => {
            realm.write(() => {
                let obj_a1 = realm.create('ObjectA', {name: "a1"});
                let obj_a2 = realm.create('ObjectA', {name: "a2"});
                let parent_1 = realm.create('Parent', {name: "p1", link: obj_a1});
                let parent_2 = realm.create('Parent', {name: "p2", link: obj_a1});
            });
            return new Promise((resolve, reject) => {
                const query = realm.objects("ObjectA");
                const sub = query.subscribe("a_objs" );
                sub.addListener((subscription, state) => {
                    if (state === Realm.Sync.SubscriptionState.Complete) {
                        sub.removeAllListeners();
                        let a_objects = realm.objects('ObjectA');
                        let parent_objects = realm.objects('Parent');
                        TestCase.assertEqual(a_objects.length, 2);
                        // parent objects were removed from local copy because they were not subscribed to
                        TestCase.assertEqual(parent_objects.length, 0);
                        resolve();
                    }
                    else if (state === Realm.Sync.SubscriptionState.Error) {
                        reject(subscription.error);
                    }
                });
            });
        });
    },

    testSubscribeParentsWithForwardLinks() {
        return getRealm().then(realm => {
            realm.write(() => {
                let obj_a1 = realm.create('ObjectA', {name: "a1"});
                let obj_a2 = realm.create('ObjectA', {name: "a2"});
                let parent_1 = realm.create('Parent', {name: "p1", child: obj_a1});
                let parent_2 = realm.create('Parent', {name: "p2", child: obj_a1});
            });
            return new Promise((resolve, reject) => {
                const query = realm.objects("Parent");
                const sub = query.subscribe("parent_objects" );
                sub.addListener((subscription, state) => {
                    if (state === Realm.Sync.SubscriptionState.Complete) {
                        sub.removeAllListeners();
                        let parent_objects = realm.objects('Parent');
                        let a_objects = realm.objects("ObjectA");
                        TestCase.assertEqual(parent_objects.length, 2);
                        // one object is not linked to and therefore not included in the subscription
                        TestCase.assertEqual(a_objects.length, 1);
                        resolve();
                    }
                    else if (state === Realm.Sync.SubscriptionState.Error) {
                        reject(subscription.error);
                    }
                });
            });
        });
    },

    testSubscribeToChildrenWithNamedParents() {
        return verifySubscriptionWithParents("parents");
    },

    testSubscribeToChildrenWithUnnamedParents() {
        return verifySubscriptionWithParents("@links.Parent.child");
    },

    testSubscribeToChildrenWithMalformedInclusion1() {
        return verifySubscriptionWithParents("something.wrong").then(() => {
            throw Error('subscription should have failed');
        },
            (err) => TestCase.assertEqual(err.message, "No property 'something' on object of type 'ObjectA'")
        );
    },

    testSubscribeToChildrenWithMalformedInclusion2() {
        return verifySubscriptionWithParents("@links.Parent.missing_property").then(() => {
            throw Error('subscription should have failed');
        },
            (err) => TestCase.assertEqual(err.message, "No property 'missing_property' found in type 'Parent' which links to type 'ObjectA'")
        );
    },

    testSubscribeToChildrenWithMalformedInclusion3() {
        return verifySubscriptionWithParents(4.2).then(() => {
            throw Error('subscription should have failed');
        },
            (err) => TestCase.assertEqual(err.message, "JS value must be of type 'string', got (4.2)")
        );
    },

    // As a convienence, we do not disallow users to write the INCLUDE as part of the query itself,
    // but it should not be encouraged nor documented. It is mostly to enable users to run
    // subscription queries that are directly copied from Studio.
    testSubscribeWithManualInclusion1() {
        return verifySubscriptionWithParents("", "TRUEPREDICATE INCLUDE(@links.Parent.child)");
    },

    testSubscribeWithManualInclusion2() {
        return verifySubscriptionWithParents("", "TRUEPREDICATE INCLUDE(parents)");
    },
};
