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

class TestObject extends Realm.Object {
  id!: number;
  name!: string;

  static schema = {
    name: "TestObject",
    primaryKey: "id",
    properties: {
      id: "int",
      name: "string",
    },
  };
}

const realmConfig: Realm.Configuration = {
  schema: [TestObject],
  path: "testArtifacts/cachedCollection",
  deleteRealmIfMigrationNeeded: true,
};

//TODO: It would be better not to have to rely on this, but at the moment I see no other alternatives
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

const FILTER_ARGS: [string] = ["id > 10"];
const SORTED_ARGS: [string, boolean] = ["id", true];

enum QueryType {
  filtered,
  sorted,
  normal,
}

describe.each`
  queryTypeName | queryType
  ${"normal"}   | ${QueryType.normal}
  ${"sorted"}   | ${QueryType.sorted}
  ${"filtered"} | ${QueryType.filtered}
`("cachedCollection: $queryTypeName", ({ queryType }) => {
  const cacheMap = new Map();
  let realm = new Realm(realmConfig);

  function applyQueryTypeToCollection<T>(queryType: QueryType, collection: Realm.Results<T>) {
    switch (queryType) {
      case QueryType.filtered:
        return collection.filtered(...FILTER_ARGS);
      case QueryType.sorted:
        return collection.sorted(...SORTED_ARGS);
      case QueryType.normal:
        return collection;
    }
  }

  beforeEach(() => {
    realm = new Realm(realmConfig);
    realm.write(() => {
      realm.deleteAll();
      testCollection.forEach((object) => realm.create(TestObject, object));
    });
  });

  afterEach(() => {
    realm.write(() => {
      realm.removeAllListeners();
    });
    realm.close();
    Realm.clearTestState();
    cacheMap.clear();
  });

  it("caches accessed objects", async () => {
    const updateFunction = jest.fn();
    const { collection, tearDown } = cachedCollection(realm.objects(TestObject), updateFunction, cacheMap);

    expect(cacheMap.size).toBe(0);

    const testCollection = applyQueryTypeToCollection(queryType, collection);

    let item = testCollection[0];
    for (let i = 0; i < testCollection.length; i++) {
      item = testCollection[i];
    }

    const lastItem = testCollection[testCollection.length - 1];

    expect(item).toEqual(lastItem);
    expect(item === lastItem).toEqual(true);
    expect(cacheMap.size).toBe(testCollection.length);

    tearDown();
  });

  it("updates on all changes", async () => {
    const updateFunction = jest.fn();
    const { collection, tearDown } = cachedCollection(realm.objects(TestObject), updateFunction, cacheMap);

    expect(cacheMap.size).toBe(0);

    const testCollection = applyQueryTypeToCollection(queryType, collection);

    expect(updateFunction).toBeCalledTimes(0);

    const newItem = realm.write(() => {
      return realm.create(TestObject, { id: TEST_COLLECTION_SIZE + 1, name: "bob" });
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

  // TODO:  This is a known issue that we have to live with until it is possible
  // to retrieve the objectId from a deleted object in a listener callback
  it.skip("removes items from the cache on deletion", async () => {
    const updateFunction = jest.fn();
    const { collection, tearDown } = cachedCollection(realm.objects(TestObject), updateFunction, cacheMap);

    expect(cacheMap.size).toBe(0);

    const testCollection = applyQueryTypeToCollection(queryType, collection);

    expect(cacheMap.size).toBe(0);

    let item = testCollection[0];
    for (let i = 0; i < testCollection.length; i++) {
      item = testCollection[i];
    }

    expect(item).toBe(testCollection[testCollection.length - 1]);
    expect(cacheMap.size).toBe(testCollection.length);

    realm.write(() => {
      realm.delete(item);
    });

    forceSynchronousNotifications(realm);

    expect(item.isValid()).toEqual(false);
    expect(cacheMap.size).toBe(testCollection.length);

    realm.write(() => {
      realm.deleteAll();
    });

    forceSynchronousNotifications(realm);

    expect(cacheMap.size).toBe(0);

    tearDown();
  });

  it("modifications replace the cached object with a new reference", async () => {
    const updateFunction = jest.fn();
    const { collection, tearDown } = cachedCollection(realm.objects(TestObject), updateFunction, cacheMap);

    expect(cacheMap.size).toBe(0);

    const testCollection = applyQueryTypeToCollection(queryType, collection);

    let item = testCollection[0];
    for (let i = 0; i < testCollection.length; i++) {
      item = testCollection[i];
    }

    expect(item).toBe(testCollection[testCollection.length - 1]);
    expect(cacheMap.size).toBe(testCollection.length);

    realm.write(() => {
      item.name = "bob";
    });

    forceSynchronousNotifications(realm);

    expect(item).toEqual(testCollection[testCollection.length - 1]);
    expect(item).not.toBe(testCollection[testCollection.length - 1]);
    expect(cacheMap.size).toBe(testCollection.length);

    tearDown();
  });

  it("tearDown removes cache references", async () => {
    const updateFunction = jest.fn();
    const { collection, tearDown } = cachedCollection(realm.objects(TestObject), updateFunction, cacheMap);

    expect(cacheMap.size).toBe(0);

    const testCollection = applyQueryTypeToCollection(queryType, collection);

    expect(cacheMap.size).toBe(0);

    let item = testCollection[0];
    for (let i = 0; i < testCollection.length; i++) {
      item = testCollection[i];
    }

    expect(item).toBe(testCollection[testCollection.length - 1]);
    expect(cacheMap.size).toBe(testCollection.length);

    tearDown();

    expect(cacheMap.size).toBe(0);
  });
});
