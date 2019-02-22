"use strict";
export {};

const Realm = require('../..');
const RosController = require('./support/ros-controller');
const TestObjectServer = require('./support/test-object-server');
const fs = require("fs");
const os = require('os');
const path = require("path");
const tmp = require('tmp');

const notificationNotReceivedTimeout = 25000;
const notificationFilterPattern = '^(?!.*\/__).*';

const LONG_TIMEOUT = 20000;
const useTestServer = true; // process.env.REALM_NODEJS_FORCE_TEST_SERVER || os.platform() != 'darwin';

const userRealmSchema = [{
    name: 'IntObject',
    properties: {
        int: 'int'
    }
}];

const ipcSchema = [{
    name: 'Event',
    properties: {
        type: 'string',
        path: 'string',
        insertions: 'int[]',
        deletions: 'int[]',
        modifications: 'int[]',
        newModifications: 'int[]',
        oldModifications: 'int[]'
    }
}];

require('jasmine-co').install();

let nextChangePromise = undefined;
let nextAvailablePromise = undefined;
let rosController = undefined;

function unexpectedNotificationError(changes) {
    let err = `unexpected notification for ${changes.path} (${Object.keys(changes.changes).length}):\n`;
    for (const objName in changes.changes) {
        const change = changes.changes[objName];
        err += ` - ${objName}: {${change.insertions}; ${change.deletions}; ${change.modifications}}\n`
    }
    return err;
}

async function addChangeListener(regex, ros) {
    const callback = (changes) => {
        if (nextChangePromise === undefined) {
            fail(new Error(unexpectedNotificationError(changes)));
            return;
        }

        const promise = nextChangePromise;
        nextChangePromise = undefined;
        try {
            promise.test(changes);
            const path = changes.path;
            setTimeout(() => promise.resolve(path), 0);
        }
        catch (error) {
            setTimeout(() => promise.reject(error), 0);
        }
    };

    await Realm.Sync.addListener({serverUrl: `realm://127.0.0.1:${ros.httpPort}`, adminUser: ros.adminUser, filterRegex: regex}, 'change', callback)
    return callback;
}

function addAvailableListener(regex, ros, expectedRealms = undefined) {
    return new Promise(async (resolve, reject) => {
        let timeout;
        const callback = (path) => {
            if (expectedRealms) {
                for (let i = 0; i < expectedRealms.length; i++) {
                    if (!path.endsWith(expectedRealms[i])) {
                        continue;
                    }
                    expectedRealms.splice(i, 1);
                    if (expectedRealms.length == 0) {
                        expectedRealms = undefined;
                        clearTimeout(timeout);
                        setTimeout(() => resolve(path), 0);
                    }
                    return;
                }
                fail(`unexpected available notification for ${path}`);
                setTimeout(() => reject(`unexpected available notification for ${path}`), 0);
                return;
            }

            if (nextAvailablePromise === undefined) {
                fail(new Error(`unexpected available notification for ${path}`));
            }

            const promise = nextAvailablePromise;
            nextAvailablePromise = undefined;
            try {
                expect(path).toMatch(promise.path);
                setTimeout(() => promise.resolve(path), 0);
            }
            catch (error) {
                setTimeout(() => promise.reject(error), 0);
            }
        };

        await Realm.Sync.addListener({serverUrl: `realm://127.0.0.1:${ros.httpPort}`, adminUser: ros.adminUser, filterRegex: regex}, 'available', callback);
        if (expectedRealms === undefined) {
            setTimeout(() => resolve(callback), 0);
        }
        else {
            timeout = setTimeout(() => {
                let message = `missing notifications for expected realms ${JSON.stringify(expectedRealms)}`;
                fail(message);
                reject(message);
            }, notificationNotReceivedTimeout);
        }
    });
}

function changeObjectPromise(action, test) {
    return new Promise((resolve, reject) => {
        nextChangePromise = {test, resolve, reject};
        action();
        setTimeout(() => reject('Notification not received'), notificationNotReceivedTimeout);
    });
}

function availablePromise(path, action) {
    return new Promise((resolve, reject) => {
        nextAvailablePromise = {path, resolve, reject};
        action();
        setTimeout(() => reject(`Notification not received for ${path}`), notificationNotReceivedTimeout);
    });
}

function notificationPromise(regex, action, notification) {
    return changeObjectPromise(action, (changes) => {
        expect(changes.path).toMatch(regex);
        expect(Object.keys(changes.changes)).toEqual(Object.keys(notification));
        for (const objectType in notification) {
            const expected = notification[objectType];
            const actual = changes.changes[objectType];
            expect(actual.insertions).toEqual(expected.insertions || []);
            expect(actual.deletions).toEqual(expected.deletions || []);
            expect(actual.modifications).toEqual(expected.modifications || []);
            expect(actual.oldModifications).toEqual(expected.modifications || []);
        }
    });
}

function expectNoNotificationPromise(action) {
    const test = (changes) => { throw new Error(unexpectedNotificationError(changes)); };
    return new Promise((resolve, reject) => {
        nextChangePromise = {test, resolve, reject};
        action();
        setTimeout(resolve, 200);
    });
}

function createRealmAndChangeListener() {
    return Promise.all([
        addChangeListener(notificationFilterPattern, rosController),
        rosController.createRealm('demo/test', userRealmSchema),
    ]);
}

describe('Notifier', () => {
    beforeEach(function() {
        this.tmpListenerDir = tmp.dirSync({ unsafeCleanup: true });
        Realm.Sync.setListenerDirectory(this.tmpListenerDir.name);
        Realm.Sync.setSyncLogger((level, message) => {
            console.log('test-client: %s', message);
        });
        Realm.Sync.setLogLevel('info');

        if (useTestServer) {
            rosController = new TestObjectServer();
        } else {
            rosController = new RosController();
        }

        return rosController.start()
    });

    afterEach(async function() {
        await Realm.Sync.removeAllListeners();
        await rosController.shutdown()
        this.tmpListenerDir.removeCallback();
        rosController = undefined;
        Realm.clearTestState();
    });


    it("should report the current listener directory", function() {
        expect(Realm.Sync.getListenerDirectory()).toEqual(this.tmpListenerDir.name);
    });

    it("should not allow changing the listener directory while a listener is active", async function() {
        // Listen to non-admin-realm changes, as otherwise we would see unexpected notifications about that.
        const promise = addChangeListener(notificationFilterPattern, rosController)
        expect(() => Realm.Sync.setListenerDirectory('.tmp')).toThrow();
        return promise;
    });

    it("should be able to change the listener directory", async function() {
        const temp = tmp.dirSync({ unsafeCleanup: true });
        Realm.Sync.setListenerDirectory(temp.name);
        await addChangeListener(notificationFilterPattern, rosController);

        // Create a Realm and wait for the GN to have synced it
        const realm = await rosController.createRealm('demo/test', userRealmSchema);
        await notificationPromise('demo/test',
            () => realm.write(() => realm.create('IntObject', [0])),
            { IntObject: { insertions: [0] } });
        realm.close();

        // Verify that the GN's copy of the Realm is in the expected place
        const adminRealm = rosController.adminRealm;
        const realmFile = adminRealm.objects('RealmFile').filtered('path ENDSWITH $0', 'demo/test')[0];
        if (!realmFile) {
            throw new Error('No matching RealmFile for filter "path ENDSWITH demo/test" in admin Realm.'
                            + `These were found: ${adminRealm.objects('RealmFile').map((f) => f.path)}`);
        }
        expect(fs.existsSync(`${temp.name}/realms${realmFile.path}/${realmFile._objectId()}.realm`)).toBeTruthy();
        temp.removeCallback();
    });

    it("should validate listener arguments", function() {
        expect(() => Realm.Sync.addListener()).toThrow();
        expect(() => Realm.Sync.addListener({serverUrl: 'invalid', adminUser: rosController.adminUser, filterRegex: '.*'}, 'change', () => {})).toThrow();
        expect(() => Realm.Sync.addListener({serverUrl: `http://127.0.0.1:${rosController.httpPort}`, adminUser: rosController.adminUser, filterRegex: '.*'}, 'change', () => {})).toThrow();
        expect(() => Realm.Sync.addListener({serverUrl: `realm://127.0.0.1:${rosController.httpPort}`, adminUser: {}, filterRegex: '.*'}, 'change', () => {})).toThrow();
        expect(() => Realm.Sync.addListener({}, 'change', () => {})).toThrow();
        expect(() => Realm.Sync.addListener({serverUrl: `http://127.0.0.1:${rosController.httpPort}`, adminUser: rosController.adminUser, filterRegex: '.*', sslConfiguration: { validate: "boom" }})).toThrow();
        //expect(() => Realm.Sync.addListener(`realm://127.0.0.1:${rosController.httpPort}`, rosController.adminUser, '.*', 'invalid', () => {})).toThrow();
    });


    it("should validate the server URL", function() {
        expect(() => Realm.Sync.addChangeListener('invalid url', rosController.adminUser, '.*', () => {}))
        .toThrow();

        expect(() => Realm.Sync.addChangeListener(`realm://127.0.0.1:${rosController.httpPort}/path`, rosController.adminUser, '.*', () => {}))
        .toThrow();
    });

    it("should report invalid admin user errors", async function() {
        const badUser = Realm.Sync.User.login(`http://127.0.1:${rosController.httpPort}`,
                                               Realm.Sync.Credentials.adminToken('invalid'));
        try {
            await Realm.Sync.addListener({serverUrl: `realm://127.0.0.1:${rosController.httpPort}`, adminUser: badUser, filterRegex: '.*'}, 'change', () => {});
            fail('Invalid admin user should have failed');
        }
        catch (e) {
            expect(e).toContain('user');
        }
    });

    it("should call the listener when a change occurs", async function() {
        const [callback, realm] = await createRealmAndChangeListener();
        await notificationPromise('demo/test',
            () => realm.write(() => realm.create('IntObject', [0])),
            { IntObject: { insertions: [ 0 ] } });
        realm.close();
    });

    it("test change multiple notifications", async function() {
        const [callback, realm] = await createRealmAndChangeListener();

        await notificationPromise(notificationFilterPattern,
            () => realm.write(() => {
                realm.create('IntObject', [0]);
                realm.create('IntObject', [1]);
            }),
            { IntObject: { insertions: [0, 1] } });
        await notificationPromise(notificationFilterPattern,
            () => realm.write(() => {
                realm.objects('IntObject')[0].int = 2;
                realm.delete(realm.objects('IntObject')[1]);
            }),
            { IntObject: { deletions: [1], modifications: [0] } });
        realm.close();
    });

    it("test change existing realm", async function() {
        const realm = await rosController.createRealm('demo/test', userRealmSchema)

        // Add a listener and sync the GN's copy of the Realm
        await addChangeListener(notificationFilterPattern, rosController);
        await notificationPromise(notificationFilterPattern,
            () => realm.write(() => realm.create('IntObject', [0])),
            { IntObject: { insertions: [0] } });

        // Remove the listener then add a new one and verify it only gets notified
        // for the new change
        Realm.Sync.removeAllListeners();
        await addChangeListener(notificationFilterPattern, rosController);
        await notificationPromise(notificationFilterPattern,
            () => realm.write(() => realm.create('IntObject', [0])),
            { IntObject: { insertions: [1] } });
        realm.close();
    }, LONG_TIMEOUT);

    it("test change multiple realms", async function() {
        const [callback, realm1, realm2] = await Promise.all([
            addChangeListener(notificationFilterPattern, rosController),
            rosController.createRealm('demo/test1', userRealmSchema),
            rosController.createRealm('demo/test2', userRealmSchema),
        ]);

        await notificationPromise(notificationFilterPattern,
            () => realm1.write(() => realm1.create('IntObject', [0])),
            { IntObject: { insertions: [ 0 ] } });
        await notificationPromise(notificationFilterPattern,
            () => realm2.write(() => realm2.create('IntObject', [0])),
            { IntObject: { insertions: [ 0 ] } });
        realm1.close();
        realm2.close();
    });

    it("should not call listeners which have been removed", async function() {
        const [callback, realm] = await createRealmAndChangeListener();
        await notificationPromise(notificationFilterPattern,
            () => realm.write(() => realm.create('IntObject', [0])),
            { IntObject: { insertions: [ 0 ] } });

        Realm.Sync.removeListener(notificationFilterPattern, 'change', callback);
        await expectNoNotificationPromise(() =>
            realm.write(() => realm.create('IntObject', [0])));
        realm.close();
    });

    it("should not call listeners after all have been removed", async function() {
        const [callback, realm] = await createRealmAndChangeListener();
        await notificationPromise(notificationFilterPattern,
            () => realm.write(() => realm.create('IntObject', [0])),
            { IntObject: { insertions: [ 0 ] } });

        Realm.Sync.removeAllListeners();
        await expectNoNotificationPromise(() =>
            realm.write(() => realm.create('IntObject', [0])));
        realm.close();
    });

    it("should report the correct old and new values in notifications", async function() {
        const [callback, realm] = await createRealmAndChangeListener();
        await notificationPromise(notificationFilterPattern,
            () => realm.write(() => {
                realm.create('IntObject', [1]);
                realm.create('IntObject', [2]);
            }),
            { IntObject: { insertions: [0, 1] } });
        await changeObjectPromise(
            () => realm.write(() => realm.objects('IntObject')[0].int = 3),
            (changes) => {
                expect(changes.realm.objects('IntObject')[0].int).toEqual(3);
                expect(changes.realm.objects('IntObject')[1].int).toEqual(2);
                expect(changes.oldRealm.objects('IntObject')[0].int).toEqual(1);
                expect(changes.oldRealm.objects('IntObject')[1].int).toEqual(2);
            });
        realm.close();
    });

    it("should only notify for changes to realms which match the regex", async function() {
        const [callback, realm1, realm2] = await Promise.all([
            addChangeListener('.*test1', rosController),
            rosController.createRealm('demo/test1', userRealmSchema),
            rosController.createRealm('demo/test2', userRealmSchema),
        ]);
        await notificationPromise(notificationFilterPattern,
            () => realm1.write(() => realm1.create('IntObject', [0])),
            { IntObject: { insertions: [ 0 ] } });
        await expectNoNotificationPromise(() =>
            realm2.write(() => realm2.create('IntObject', [0])));
        realm1.close();
        realm2.close();
    });

    it("should notify for realms which existed before a matching regex was added", async function() {
        const [realm1, realm2] = await Promise.all([
            rosController.createRealm('demo/test1', userRealmSchema),
            rosController.createRealm('demo/test2', userRealmSchema),
        ]);

        await addChangeListener('.*test1', rosController);
        await notificationPromise('.*test1',
            () => realm1.write(() => realm1.create('IntObject', [0])),
            { IntObject: { insertions: [ 0 ] } });

        await addChangeListener('.*test2', rosController);
        await notificationPromise('.*test2',
            () => realm2.write(() => realm2.create('IntObject', [0])),
            { IntObject: { insertions: [ 0 ] } });
        realm1.close();
        realm2.close();
    });

    it("test available", async function() {
        await addAvailableListener(notificationFilterPattern, rosController);
        let realm;
        await availablePromise('demo/test', () =>
            realm = rosController.createRealm('demo/test', userRealmSchema));
        (await realm).close();
    });

    it("test available existing realm", async function() {
        (await rosController.createRealm('demo/test', userRealmSchema)).close();
        return addAvailableListener(notificationFilterPattern, rosController, ['demo/test']);
    });

    it("test available existing regex", async function() {
        (await rosController.createRealm('demo/test1', userRealmSchema)).close();
        (await rosController.createRealm('demo/test2', userRealmSchema)).close();

        // Wait for second one to ensure that both have been seen by the GN
        await addAvailableListener('.*test2', rosController, ['demo/test2']);

        // Then verify that adding a new regex notifies for the already-known Realm
        return addAvailableListener('.*test1', rosController, ['demo/test1']);
    });

    it("test available and change", async function() {
        const [realm1, realm2] = await Promise.all([
            rosController.createRealm('demo/test1', userRealmSchema),
            rosController.createRealm('demo/test2', userRealmSchema),
        ]);
        await new Promise((resolve) => setTimeout(resolve, 200)); // FIXME: do we need this sleep?

        await addAvailableListener('.*test2', rosController, ['demo/test2']);
        await addAvailableListener(notificationFilterPattern, rosController, ['demo/test1', 'demo/test2']);
        let realm3;
        await availablePromise('demo/test3', () =>
            realm3 = rosController.createRealm('demo/test3', userRealmSchema));
        await addChangeListener('.*test2', rosController);
        await notificationPromise('.*test2',
            () => realm2.write(() => realm2.create('IntObject', [0])),
            { IntObject: { insertions: [ 0 ] } });
        await addAvailableListener('.*test.', rosController, ['demo/test1', 'demo/test2', 'demo/test3']);
        realm1.close();
        realm2.close();
        (await realm3).close();
    }, LONG_TIMEOUT);

    // Push all change notifications onto an awaitable queue
    let pendingChanges = [];
    let nextChangeResolve;
    function nextPendingChange() {
        if (pendingChanges.length) {
            return Promise.resolve(pendingChanges.shift());
        }
        return new Promise(r => {
            nextChangeResolve = r;
        });
    }
    async function enqueuePendingChange(changes) {
        let resolve = nextChangeResolve;
        nextChangeResolve = undefined;
        return new Promise(r => {
            if (resolve) {
                resolve([changes, r]);
            }
            else {
                pendingChanges.push([changes, r]);
            }
        });
    }

    it('should support async change callbacks', async () => {
        await Realm.Sync.addListener({serverUrl: `realm://127.0.0.1:${rosController.httpPort}`,
            adminUser: rosController.adminUser, filterRegex: '.*', sslConfiguration: { validate: false }}, 'change', enqueuePendingChange);

        const [realm1, realm2] = await Promise.all([
            rosController.createRealm('demo/test1', userRealmSchema),
            rosController.createRealm('demo/test2', userRealmSchema),
        ]);

        realm1.write(() => realm1.create('IntObject', [0]));
        const [change1, resolve1] = await nextPendingChange();

        // Make a second change to realm1, which *should not* produce a
        // notification since we haven't finished processing the previous
        // notification for that Realm. waitForUpload() is to encourage proper
        // sequencing; we want the GN to process this write before the one to
        // realm2.
        realm1.write(() => realm1.create('IntObject', [1]));
        await realm1.syncSession.uploadAllLocalChanges();

        // Modifying realm2 should produce a notification since multiple Realms
        // can be processed concurrently.
        realm2.write(() => realm2.create('IntObject', [2]));
        const [change2, resolve2] = await nextPendingChange();

        // Change objects should be valid still
        expect(change1.path).toEqual('/demo/test1');
        expect(change1.realm.objects('IntObject').length).toEqual(1);
        expect(change2.path).toEqual('/demo/test2');
        expect(change2.realm.objects('IntObject').length).toEqual(1);

        // Should invalidate change2
        resolve2();
        // Give async resolution of the promise resolving a chance to run
        await new Promise(r => setTimeout(r, 0));
        expect(() => change2.oldRealm).toThrow();

        // After resolving the first change for realm1, we should be able to get the second change
        resolve1();
        const [change3, resolve3] = await nextPendingChange();
        expect(change3.path).toEqual('/demo/test1');
        expect(change3.realm.objects('IntObject').length).toEqual(2);
        resolve3();

        realm1.close();
        realm2.close();
    });

    it('should properly handle many realms changing at once', async () => {
        await Realm.Sync.addListener({serverUrl: `realm://127.0.0.1:${rosController.httpPort}`,
            adminUser: rosController.adminUser, filterRegex: '.*'}, 'change', enqueuePendingChange);

        // Make writes on 10 Realms at once without giving it the chance to
        // deliver notifications between them
        const count = 10;
        const realms = await Promise.all(Array.from({length: count},
            (_, i) => rosController.createRealm(`demo/test${i}`, userRealmSchema)));
        for (const realm of realms) {
            realm.write(() => realm.create('IntObject', [2]));
        }

        // Verify that we actually get notifications for all 10
        const results = {};
        for (let i = 0; i < count; ++i) {
            const [change, resolve] = await nextPendingChange();
            results[change.path] = true;
            resolve();
        }
        expect(Object.keys(results).length).toEqual(count);
        realms.forEach(r => r.close());
    });

    xit('should correctly handle realms which are deleted and then re-created', async() => {
        let realm = await rosController.createRealm('demo/test', userRealmSchema);
        await Realm.Sync.addListener({serverUrl: `realm://127.0.0.1:${rosController.httpPort}`,
            adminUser: rosController.adminUser, filterRegex: '.*'}, 'change', enqueuePendingChange);

        realm.write(() => realm.create('IntObject', [1]));

        let [change, resolve] = await nextPendingChange();
        expect(change.path).toEqual('/demo/test');
        expect(change.changes.IntObject.insertions).toEqual([0]);
        expect(change.realm.objects('IntObject')[0].int).toEqual(1);

        realm.write(() => realm.create('IntObject', [2]));
        realm.close();

        await rosController.deleteRealm('/demo/test');

        const tmpDir = tmp.dirSync({ unsafeCleanup: true });
        realm = await rosController.createRealm('demo/test', userRealmSchema, `${tmpDir.name}/realm2.realm`);
        realm.write(() => realm.create('IntObject', [3]));
        realm.close();
        tmpDir.removeCallback();

        resolve();
        [change, resolve] = await nextPendingChange();
        expect(change.path).toEqual('/demo/test');
        expect(change.changes.IntObject.insertions).toEqual([1]);
        expect(change.realm.objects('IntObject')[1].int).toEqual(2);
        resolve();

        [change, resolve] = await nextPendingChange();
        expect(change.path).toEqual('/demo/test');
        expect(change.changes.IntObject.insertions).toEqual([0]);
        expect(change.realm.objects('IntObject')[0].int).toEqual(3);
        resolve();
    });

    it('should notify for watched Realms being deleted', async() => {
        const realm = await rosController.createRealm('demo/test', userRealmSchema);
        await Realm.Sync.addListener({serverUrl: `realm://127.0.0.1:${rosController.httpPort}`,
            adminUser: rosController.adminUser, filterRegex: '.*'}, 'delete', enqueuePendingChange);

        await rosController.deleteRealm('/demo/test');

        const [change, resolve] = await nextPendingChange();
        expect(change).toEqual('/demo/test');
        expect(pendingChanges.length).toEqual(0);
        resolve();

        realm.close();
    });

    it('should not notify for unwatched Realms being deleted', async() => {
        const realms = await Promise.all([
            rosController.createRealm('demo/test1', userRealmSchema),
            rosController.createRealm('demo/test2', userRealmSchema),
        ]);
        await Realm.Sync.addListener({serverUrl: `realm://127.0.0.1:${rosController.httpPort}`,
            adminUser: rosController.adminUser, filterRegex: '/demo/test2'}, 'delete', enqueuePendingChange);

        await rosController.deleteRealm('/demo/test1');
        await rosController.deleteRealm('/demo/test2');

        const [change, resolve] = await nextPendingChange();
        expect(change).toEqual('/demo/test2');
        expect(pendingChanges.length).toEqual(0);
        resolve();

        realms.forEach(r => r.close());
    });

    it('should not notify for spurious deletions from moves', async() => {
        const realms = await Promise.all([
            rosController.createRealm('demo/test1', userRealmSchema),
            rosController.createRealm('demo/test2', userRealmSchema),
            rosController.createRealm('demo/test3', userRealmSchema),
        ]);
        await Realm.Sync.addListener({serverUrl: `realm://127.0.0.1:${rosController.httpPort}`,
            adminUser: rosController.adminUser, filterRegex: '.*'}, 'delete', enqueuePendingChange);

        await rosController.deleteRealm('/demo/test1');

        const [change, resolve] = await nextPendingChange();
        expect(change).toEqual('/demo/test1');
        expect(pendingChanges.length).toEqual(0);
        resolve();

        realms.forEach(r => r.close());
    });

    it('should finish delivering pending notifications for deleted Realms', async() => {
        const [realm1, realm2] = await Promise.all([
            rosController.createRealm('demo/test1', userRealmSchema),
            rosController.createRealm('demo/test2', userRealmSchema),
        ]);

        await Realm.Sync.addListener({serverUrl: `realm://127.0.0.1:${rosController.httpPort}`,
            adminUser: rosController.adminUser, filterRegex: '.*'}, 'change', enqueuePendingChange);
        await Realm.Sync.addListener({serverUrl: `realm://127.0.0.1:${rosController.httpPort}`,
            adminUser: rosController.adminUser, filterRegex: '.*'}, 'delete', enqueuePendingChange);

        realm1.write(() => realm1.create('IntObject', [0]));
        const [change1, resolve1] = await nextPendingChange();
        realm1.write(() => realm1.create('IntObject', [1]));
        await realm1.syncSession.uploadAllLocalChanges();
        realm2.write(() => realm2.create('IntObject', [2]));
        const [change2, resolve2] = await nextPendingChange();

        // At this point we can know that realm1 has a pending notification, as
        // the write on it should have been processed before the write on
        // realm2, and we have a notification for that
        await rosController.deleteRealm('/demo/test1');

        // Even though the realm has been deleted, completing the first change
        // notification should still give us the second one
        resolve1();
        const [change3, resolve3] = await nextPendingChange();
        expect(change3.path).toEqual('/demo/test1');
        expect(change3.realm.objects('IntObject').length).toEqual(2);

        // Resolving the second change should then give us the deletion notification
        resolve3();
        const [change4, resolve4] = await nextPendingChange();
        expect(change4).toEqual('/demo/test1');

        resolve2();
        resolve4();

        realm1.close();
        realm2.close();
    });

    it('should remove the local Realm file after the notification completes', async() => {
        // Create a Realm and wait for the GN to have synced it
        const [callback, realm] = await createRealmAndChangeListener();
        await notificationPromise('demo/test',
            () => realm.write(() => realm.create('IntObject', [0])),
            { IntObject: { insertions: [ 0 ] } });
        realm.close();

        // Verify that the local copy exists
        const root = Realm.Sync.getListenerDirectory();
        const realmFile = rosController.adminRealm.objects('RealmFile').filtered('path == "/demo/test"')[0];
        const path = `${root}/realms${realmFile.path}/${realmFile._objectId()}.realm`;
        expect(fs.existsSync(path)).toBeTruthy();

        await Realm.Sync.addListener({serverUrl: `realm://127.0.0.1:${rosController.httpPort}`,
            adminUser: rosController.adminUser, filterRegex: '.*'}, 'delete', enqueuePendingChange);

        // Local copy should still exist immediately after deleting on the server
        await rosController.deleteRealm('/demo/test');
        expect(fs.existsSync(path)).toBeTruthy();

        // and after recieving but not completing the notification
        const [change, resolve] = await nextPendingChange();
        expect(fs.existsSync(path)).toBeTruthy();

        // And should not after resolving the notification
        resolve();
        await new Promise(r => setTimeout(r, 0)); // let event loop run once
        expect(fs.existsSync(path)).toBeFalsy();
    });
});

describe('Multi-process Notifier', () => {
    let tmpIpcPath, worker;
    beforeEach(function() {
        this.tmpListenerDir = tmp.dirSync({ unsafeCleanup: true });
        this.tmpIpcDir = tmp.dirSync({ unsafeCleanup: true });
        tmpIpcPath = this.tmpIpcDir.name + '/test.realm';
        Realm.Sync.setListenerDirectory(this.tmpListenerDir.name);
        Realm.Sync.setSyncLogger((level, message) => {
            console.log('test-client: %s', message);
        });
        Realm.Sync.setLogLevel('info');

        worker = new Realm.Worker(__dirname + '/support/notification-worker.ts', {
            execArgv: ['-r', 'ts-node/register'],
            env: {
                communication_realm_path: tmpIpcPath,
                HOME: __dirname,
                PATH: process.env.PATH,
            }
        });

        if (useTestServer) {
            rosController = new TestObjectServer();
        } else {
            rosController = new RosController();
        }

        return rosController.start()
    });

    afterEach(async function() {
        await Realm.Sync.removeAllListeners();
        if (rosController) {
            await rosController.shutdown();
        }
        this.tmpListenerDir.removeCallback();
        this.tmpIpcDir.removeCallback();
        rosController = undefined;
        Realm.clearTestState();
    });

    async function expectNotifications(regex: string, fn) { //}: (() => Promise<object>) => Promise<void>) {
        await Realm.Sync.addListener(`realm://127.0.0.1:${rosController.httpPort}`, rosController.adminUser, regex, worker);
        const realm = await Realm.open({path: tmpIpcPath, schema: ipcSchema});
        const events = realm.objects('Event');
        let i = 0;
        await fn(() => {
            return new Promise((resolve, reject) => {
                let timeout = setTimeout(() => reject('Wait for notification timed out'), 5000);
                events.addListener(() => {
                    if (events.length <= i) {
                        return;
                    }

                    clearTimeout(timeout);
                    resolve(events[i]);
                    ++i;
                    events.removeAllListeners();
                });
            });
        });
        expect(events.length).toEqual(i);
    }

    function expectArrayishEqual(a, b) {
        expect(a.length).toEqual(b.length);
        for (let i = 0; i < a.length; ++i) {
            expect(a[i]).toEqual(b[i]);
        }
    }

    function expectEvent(event, type, path, insertions=[], deletions=[], modifications=[]) {
        expect(event.type).toEqual(type);
        expect(event.path).toEqual(path);
        expectArrayishEqual(event.insertions, insertions);
        expectArrayishEqual(event.deletions, deletions);
        expectArrayishEqual(event.modifications, modifications);
        expectArrayishEqual(event.oldModifications, modifications);
    }

    // expect an event for each of the realms at the paths present in events
    // needed because events on multiple realms will arrive in nondeterministic order
    async function expectEvents(next, events) {
        while (Object.keys(events).length) {
            const actual = await next();
            const expected = events[actual.path];
            expect(expected).toBeDefined();
            delete events[actual.path];
            expectEvent(actual, expected[0], actual.path, expected[1], expected[1], expected[2]);
        }
    }

    it("should report preexisting realms that match the regex", async () => {
        await Promise.all([
            rosController.createRealm('demo/test1', userRealmSchema).then(r => r.close()),
            rosController.createRealm('demo/test2', userRealmSchema).then(r => r.close()),
            rosController.createRealm('demo/test3', userRealmSchema).then(r => r.close())]);
        await expectNotifications('demo/test.*', async (next) => {
            await expectEvents(next, {
                '/demo/test1': ['available'],
                '/demo/test2': ['available'],
                '/demo/test3': ['available'],
            });
        });
    });

    it("should report newly available realms that match the regex", async () => {
        return expectNotifications('demo/test.*', async (next) => {
            let realms = [];
            realms.push(rosController.createRealm('demo/test1', userRealmSchema).then(r => r.close()));
            expectEvent(await next(), 'available', '/demo/test1');

            realms.push(rosController.createRealm('demo/test2', userRealmSchema).then(r => r.close()));
            realms.push(rosController.createRealm('demo/test3', userRealmSchema).then(r => r.close()));
            await expectEvents(next, {
                '/demo/test2': ['available'],
                '/demo/test3': ['available'],
            });
            await Promise.all(realms);
        });
    });

    it("should not report realms that do not match the regex", async () => {
        await Promise.all([rosController.createRealm('demo/bad', userRealmSchema).then(r => r.close()),
                           rosController.createRealm('demo/good', userRealmSchema).then(r => r.close())]);
        return expectNotifications('demo/good', async (next) => {
            expectEvent(await next(), 'available', '/demo/good');
        });
    });

    it("should report changes made to realms", async () => {
        const realm = await rosController.createRealm('demo/test', userRealmSchema);
        await expectNotifications('demo/test', async (next) => {
            expectEvent(await next(), 'available', '/demo/test');

            realm.write(() => realm.create('IntObject', [0]));
            expectEvent(await next(), 'change', '/demo/test', [0]);

            realm.write(() => realm.create('IntObject', [0]));
            expectEvent(await next(), 'change', '/demo/test', [1]);

            realm.write(() => { realm.objects('IntObject')[1].int = 2; });
            expectEvent(await next(), 'change', '/demo/test', [], [], [1]);

            realm.write(() => { realm.delete(realm.objects('IntObject')[0]); });
            expectEvent(await next(), 'change', '/demo/test', [0], [0, 1], []);
        });
        realm.close();
    });

    it('should notify for watched Realms being deleted', async() => {
        const realm = await rosController.createRealm('demo/test', userRealmSchema);
        await expectNotifications('demo/test', async (next) => {
            expectEvent(await next(), 'available', '/demo/test');

            await rosController.deleteRealm('/demo/test');
            expectEvent(await next(), 'delete', '/demo/test');
        });
        realm.close();
    });
});
