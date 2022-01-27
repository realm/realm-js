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
import { update } from "lodash";
import Realm from "realm";
import { cachedCollection } from "../cachedCollection";
import { cachedObject } from "../cachedObject";

export class ListItem extends Realm.Object {
  id!: number;
  name!: string;
  lists!: Realm.List<List>;

  static schema: Realm.ObjectSchema = {
    name: "ListItem",
    properties: {
      id: "int",
      name: "string",
      lists: {
        type: "linkingObjects",
        objectType: "List",
        property: "items",
      },
    },
    primaryKey: "id",
  };
}

export class List extends Realm.Object {
  id!: number;
  title!: string;
  items!: Realm.List<ListItem>;
  favoriteItem?: ListItem;

  static schema: Realm.ObjectSchema = {
    name: "List",
    properties: {
      id: "int",
      title: "string",
      items: "ListItem[]",
      favoriteItem: "ListItem",
    },
    primaryKey: "id",
  };
}

const realmConfig: Realm.Configuration = {
  schema: [List, ListItem],
  path: "testArtifacts/cachedObject",
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

describe("cachedObject", () => {
  const cacheMap = new Map();
  const listCaches = new Map();
  let realm = new Realm(realmConfig);
  let object: (List & Realm.Object) | null = null;
  let tearDown: () => void | undefined = () => undefined;
  const updateFunction = jest.fn();
  let listTeardowns: (() => void)[] = [];

  beforeEach(() => {
    realm = new Realm({ ...realmConfig, path: `${realmConfig.path}` });
    realm.write(() => {
      realm.deleteAll();
      const list = realm.create(List, { id: 1, title: "List" });
      testCollection.forEach((object) => list.items.push(realm.create(ListItem, object)));
    });
    const list = realm.objectForPrimaryKey(List, 1);
    const listItems = list!.items;
    const { collection, tearDown: colTearDown } = cachedCollection(listItems, updateFunction, cacheMap);
    listCaches.set("items", collection);
    listTeardowns.push(colTearDown);
    ({ object, tearDown } = cachedObject(list!, updateFunction, listCaches, listTeardowns));
  });

  afterEach(() => {
    realm.write(() => {
      realm.removeAllListeners();
    });
    realm.close();
    Realm.clearTestState();
    listCaches.clear();
    cacheMap.clear();
    updateFunction.mockReset();
    listTeardowns = [];
  });

  it("caches accessed objects", async () => {
    expect(cacheMap.size).toBe(0);

    const listItems = object!.items;
    let item = listItems[0];
    for (let i = 0; i < listItems.length; i++) {
      item = listItems[i];
    }

    const lastItem = listItems[testCollection.length - 1];

    expect(item).toEqual(lastItem);
    expect(item === lastItem).toEqual(true);
    expect(cacheMap.size).toBe(testCollection.length);

    tearDown();
  });

  it("updates on all changes", async () => {
    expect(cacheMap.size).toBe(0);

    const testCollection = object!.items;

    expect(updateFunction).toBeCalledTimes(0);

    const newItem = realm.write(() => {
      const tmpItem = realm.create(ListItem, { id: TEST_COLLECTION_SIZE + 1, name: "bob" });
      testCollection.push(tmpItem);
      return tmpItem;
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
    expect(cacheMap.size).toBe(0);

    const testCollection = object!.items;

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
    expect(cacheMap.size).toBe(0);

    const testCollection = object!.items;

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
    const testCollection = object!.items;

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
