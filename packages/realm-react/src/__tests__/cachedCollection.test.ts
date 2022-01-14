////////////////////////////////////////////////////////////////////////////
//
// Copyright 2022 Realm Inc.
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
import Realm from "realm";
import { cachedCollection } from "../cachedCollection";

class Object extends Realm.Object {
  id!: number;
  name!: string;

  static schema = {
    name: "Object",
    primaryKey: "id",
    properties: {
      id: "int",
      name: "string",
    },
  };
}

const realmConfig: Realm.Configuration = {
  schema: [Object],
  path: "testArtifacts/cachedCollection",
  deleteRealmIfMigrationNeeded: true,
};

function forceSynchronousNotifications(realm: Realm) {
  // Starting a transaction will force all listeners to advance to the latest version
  // and deliver notifications. We don't need to commit the transaction for this to work.
  realm.beginTransaction();
  realm.cancelTransaction();
}

const TEST_COLLECTION_SIZE = 100;

const testCollection = new Array(TEST_COLLECTION_SIZE)
  .fill(undefined)
  .map((_, index) => ({ id: index, name: `${index}` }));

describe("cachedCollection", () => {
  const cacheMap = new Map();
  let realm = new Realm(realmConfig);

  beforeEach(() => {
    realm = new Realm(realmConfig);
    realm.write(() => {
      testCollection.forEach((object) => realm.create("Object", object));
    });
  });

  afterEach(() => {
    realm.write(() => {
      realm.removeAllListeners();
      realm.deleteAll();
    });
    realm.close();
    Realm.clearTestState();
    cacheMap.clear();
  });

  it("caches accessed objects", async () => {
    const updateFunction = jest.fn();
    const { collection, tearDown } = cachedCollection(realm.objects(Object), updateFunction, cacheMap);

    expect(cacheMap.size).toBe(0);

    let item = collection[0];
    for (let i = 0; i < TEST_COLLECTION_SIZE; i++) {
      item = collection[i];
    }

    expect(item).toBe(collection[TEST_COLLECTION_SIZE - 1]);
    expect(cacheMap.size).toBe(TEST_COLLECTION_SIZE);

    tearDown();
  });

  it("updates on all changes", async () => {
    const updateFunction = jest.fn();
    const { collection, tearDown } = cachedCollection(realm.objects(Object), updateFunction, cacheMap);

    expect(updateFunction).toBeCalledTimes(0);

    const newItem = realm.write(() => {
      return realm.create(Object, { id: TEST_COLLECTION_SIZE + 1, name: "bob" });
    });

    forceSynchronousNotifications(realm);

    expect(updateFunction).toBeCalledTimes(1);

    realm.write(() => {
      newItem.name = "bill";
    });

    forceSynchronousNotifications(realm);

    expect(updateFunction).toBeCalledTimes(2);

    realm.write(() => {
      realm.delete(newItem);
    });

    forceSynchronousNotifications(realm);

    expect(updateFunction).toBeCalledTimes(3);

    tearDown();
  });

  it("removes items from the cache on deletion", async () => {
    const updateFunction = jest.fn();
    const { collection, tearDown } = cachedCollection(realm.objects(Object), updateFunction, cacheMap);

    expect(cacheMap.size).toBe(0);

    let item = collection[0];
    for (let i = 0; i < TEST_COLLECTION_SIZE; i++) {
      item = collection[i];
    }

    expect(item).toBe(collection[TEST_COLLECTION_SIZE - 1]);
    expect(cacheMap.size).toBe(TEST_COLLECTION_SIZE);

    realm.write(() => {
      realm.delete(item);
    });

    forceSynchronousNotifications(realm);

    expect(item.isValid()).toEqual(false);
    expect(cacheMap.size).toBe(TEST_COLLECTION_SIZE - 1);

    realm.write(() => {
      realm.deleteAll();
    });

    forceSynchronousNotifications(realm);

    expect(cacheMap.size).toBe(0);

    tearDown();
  });

  it("modifications replace the cached object with a new reference", async () => {
    const updateFunction = jest.fn();
    const { collection, tearDown } = cachedCollection(realm.objects(Object), updateFunction, cacheMap);

    expect(cacheMap.size).toBe(0);

    let item = collection[0];
    for (let i = 0; i < TEST_COLLECTION_SIZE; i++) {
      item = collection[i];
    }

    expect(item).toBe(collection[TEST_COLLECTION_SIZE - 1]);
    expect(cacheMap.size).toBe(TEST_COLLECTION_SIZE);

    realm.write(() => {
      item.name = "bob";
    });

    forceSynchronousNotifications(realm);

    expect(item).not.toBe(collection[TEST_COLLECTION_SIZE - 1]);
    expect(cacheMap.size).toBe(TEST_COLLECTION_SIZE);

    tearDown();
  });

  it("tearDown removes cache references", async () => {
    const updateFunction = jest.fn();
    const { collection, tearDown } = cachedCollection(realm.objects(Object), updateFunction, cacheMap);

    expect(cacheMap.size).toBe(0);

    let item = collection[0];
    for (let i = 0; i < TEST_COLLECTION_SIZE; i++) {
      item = collection[i];
    }

    expect(item).toBe(collection[TEST_COLLECTION_SIZE - 1]);
    expect(cacheMap.size).toBe(TEST_COLLECTION_SIZE);

    tearDown();

    expect(cacheMap.size).toBe(0);
  });
});
