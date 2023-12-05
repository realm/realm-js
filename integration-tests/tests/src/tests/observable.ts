////////////////////////////////////////////////////////////////////////////
//
// Copyright 2023 Realm Inc.
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

/**
 * This suite aims to test observability of Realm, Realm.Object and all collection types.
 * In particular, it aims to test:
 * - Adding a listener will call the callback on change.
 */

import { expect } from "chai";

import Realm, { CollectionChangeSet, DictionaryChangeSet, ObjectChangeSet } from "realm";

import { openRealmBefore, openRealmBeforeEach } from "../hooks";
import { createListenerStub } from "../utils/listener-stub";
import { createPromiseHandle } from "../utils/promise-handle";

type Observable = Realm | Realm.Object<any> | Realm.Results<any> | Realm.List<any> | Realm.Dictionary | Realm.Set<any>;

function expectObservableMethods(observable: Observable) {
  expect(observable.addListener).to.be.a("function");
  expect(observable.removeListener).to.be.a("function");
  expect(observable.removeAllListeners).to.be.a("function");
}

function expectRealmNotifications(
  realm: Realm,
  eventName: "change" | "schema" | "beforenotify",
  expectedChangeSets: { schema?: Realm.CanonicalObjectSchema[] }[],
) {
  const handle = createPromiseHandle();
  realm.addListener(
    eventName,
    createListenerStub(
      handle,
      ...expectedChangeSets.map(
        (expectedChanges, c) => (realm: Realm, name: string, schema?: Realm.CanonicalObjectSchema[]) => {
          expect(name).equals(eventName, `Realm change event #${c} name didn't match`);
          expect(schema).deep.equals(expectedChanges.schema, `Realm change event #${c} schema didn't match`);
        },
      ),
    ),
  );
  return handle;
}

function expectObjectNotifications<T>(object: Realm.Object<T>, expectedChangeSets: ObjectChangeSet<T>[]) {
  const handle = createPromiseHandle();
  object.addListener(
    createListenerStub(
      handle,
      ...expectedChangeSets.map((expectedChanges, c) => (_: Realm.Object<T>, changes: ObjectChangeSet<T>) => {
        expect(changes).deep.equals(expectedChanges, `Changeset #${c} didn't match`);
      }),
    ),
  );
  return handle;
}

function expectCollectionNotifications(collection: Realm.Collection, expectedChangeSets: CollectionChangeSet[]) {
  const handle = createPromiseHandle();
  collection.addListener(
    createListenerStub(
      handle,
      ...expectedChangeSets.map((expectedChanges, c) => (_: Realm.Collection, changes: CollectionChangeSet) => {
        expect(changes).deep.equals(expectedChanges, `Changeset #${c} didn't match`);
      }),
    ),
  );
  return handle;
}

function expectDictionaryNotifications(dictionary: Realm.Dictionary, expectedChangeSets: DictionaryChangeSet[]) {
  const handle = createPromiseHandle();
  dictionary.addListener(
    createListenerStub(
      handle,
      ...expectedChangeSets.map((expectedChanges, c) => (_: Realm.Dictionary, changes: DictionaryChangeSet) => {
        expect(changes).deep.equals(expectedChanges, `Changeset #${c} didn't match`);
      }),
    ),
  );
  return handle;
}

describe("Observable", () => {
  // describe("App", () => {});

  describe("Realm", () => {
    openRealmBeforeEach({
      schema: [
        {
          name: "Person",
          properties: {
            name: "string",
          },
        },
      ],
    });

    it("is observable", function (this: RealmContext) {
      expectObservableMethods(this.realm);
    });

    describe("change", () => {
      it("calls listener", async function (this: RealmContext) {
        const completion = expectRealmNotifications(this.realm, "change", [{}]);

        this.realm.write(() => {
          this.realm.create("Person", { name: "Alice" });
        });

        await completion;
      });

      it("removes listeners", async function (this: RealmContext) {
        const handle = createPromiseHandle();

        const listener = createListenerStub(handle, () => {
          this.realm.removeListener("change", listener);
          setImmediate(() => {
            this.realm.write(() => {
              this.realm.create("Person", { name: "Bob" });
            });
          });
        });

        this.realm.addListener("change", listener);

        this.realm.write(() => {
          this.realm.create("Person", { name: "Alice" });
        });

        await handle;
      });

      it("removes all listeners", async function (this: RealmContext) {
        const handle = createPromiseHandle();

        const listener = createListenerStub(handle, () => {
          this.realm.removeAllListeners("change");
          setImmediate(() => {
            this.realm.write(() => {
              this.realm.create("Person", { name: "Bob" });
            });
          });
        });

        this.realm.addListener("change", listener);

        this.realm.write(() => {
          this.realm.create("Person", { name: "Alice" });
        });

        await handle;
      });
    });

    describe("beforenotify", () => {
      // Skipping on React Native because the callback is called one too many times
      it.skipIf(environment.reactNative, "calls listener", async function (this: RealmContext) {
        const completion = expectRealmNotifications(this.realm, "beforenotify", [{}]);

        this.realm.write(() => {
          this.realm.create("Person", { name: "Alice" });
        });

        await completion;
      });

      it("removes listeners", async function (this: RealmContext) {
        const handle = createPromiseHandle();

        const listener = createListenerStub(handle, () => {
          this.realm.removeListener("beforenotify", listener);
          setImmediate(() => {
            this.realm.write(() => {
              this.realm.create("Person", { name: "Bob" });
            });
          });
        });

        this.realm.addListener("beforenotify", listener);

        this.realm.write(() => {
          this.realm.create("Person", { name: "Alice" });
        });

        await handle;
      });

      it("removes all listeners", async function (this: RealmContext) {
        const handle = createPromiseHandle();

        const listener = createListenerStub(handle, () => {
          this.realm.removeAllListeners("beforenotify");
          setImmediate(() => {
            this.realm.write(() => {
              this.realm.create("Person", { name: "Bob" });
            });
          });
        });

        this.realm.addListener("beforenotify", listener);

        this.realm.write(() => {
          this.realm.create("Person", { name: "Alice" });
        });

        await handle;
      });
    });

    describe("schema", () => {
      type InternalRealmContext = RealmContext & {
        realm: Realm & { _updateSchema(schema: Realm.ObjectSchema[]): void };
      };

      it("calls listener", async function (this: InternalRealmContext) {
        const completion = expectRealmNotifications(this.realm, "schema", [
          {
            schema: [
              {
                ctor: undefined,
                name: "Person",
                asymmetric: false,
                embedded: false,
                properties: {
                  name: {
                    name: "name",
                    type: "string",
                    optional: false,
                    indexed: false,
                    mapTo: "name",
                    default: undefined,
                  },
                },
              },
            ],
          },
        ]);

        this.realm.write(() => {
          this.realm._updateSchema([{ name: "Person", properties: { name: "string" } }]);
        });

        await completion;
      });

      it("removes listeners", async function (this: InternalRealmContext) {
        const handle = createPromiseHandle();

        const listener = createListenerStub(handle, () => {
          this.realm.removeListener("schema", listener);
          setImmediate(() => {
            this.realm.write(() => {
              this.realm._updateSchema([{ name: "Person", properties: { name: "string" } }]);
            });
          });
        });

        this.realm.addListener("schema", listener);

        this.realm.write(() => {
          this.realm._updateSchema([{ name: "Person", properties: { name: "string" } }]);
        });

        await handle;
      });

      it("removes all listeners", async function (this: InternalRealmContext) {
        const handle = createPromiseHandle();

        const listener = createListenerStub(handle, () => {
          this.realm.removeAllListeners("schema");
          setImmediate(() => {
            this.realm.write(() => {
              this.realm._updateSchema([{ name: "Person", properties: { name: "string" } }]);
            });
          });
        });

        this.realm.addListener("schema", listener);

        this.realm.write(() => {
          this.realm._updateSchema([{ name: "Person", properties: { name: "string" } }]);
        });

        await handle;
      });
    });
  });

  describe("Object", () => {
    type Person = { name: string };
    openRealmBeforeEach({
      schema: [
        {
          name: "Person",
          properties: {
            name: "string",
          },
        },
      ],
    });

    beforeEach(function (this: RealmObjectContext<Person>) {
      this.object = this.realm.write(() => {
        return this.realm.create<Person>("Person", { name: "Alice" });
      });
    });

    it("is observable", function (this: RealmObjectContext<Person>) {
      expectObservableMethods(this.object);
    });

    it("calls listener initially", async function (this: RealmObjectContext<Person>) {
      await expectObjectNotifications(this.object, [{ deleted: false, changedProperties: [] }]);
    });

    it("calls listener", async function (this: RealmObjectContext<Person>) {
      const completion = expectObjectNotifications(this.object, [
        { deleted: false, changedProperties: [] },
        { deleted: false, changedProperties: ["name"] },
      ]);

      this.realm.write(() => {
        this.object.name = "Bob";
      });

      await completion;
    });

    it("removes listeners", async function (this: RealmObjectContext<Person>) {
      const handle = createPromiseHandle();

      const listener = createListenerStub(
        handle,
        () => {
          this.realm.write(() => {
            this.object.name = "Bob";
          });
        },
        () => {
          this.object.removeListener(listener);
          this.realm.write(() => {
            this.object.name = "Charlie";
          });
        },
      );

      this.object.addListener(listener);

      await handle;
    });

    it("removes all listeners", async function (this: RealmObjectContext<Person>) {
      const handle = createPromiseHandle();

      const listener = createListenerStub(
        handle,
        () => {
          this.realm.write(() => {
            this.object.name = "Bob";
          });
        },
        () => {
          // Remove all listeners and trigger a change
          this.object.removeAllListeners();
          this.realm.write(() => {
            this.object.name = "Charlie";
          });
        },
      );

      this.object.addListener(listener);

      await handle;
    });
  });

  describe("Results", () => {
    type Person = { name: string };
    // change: with / without key-paths
    openRealmBeforeEach({
      schema: [
        {
          name: "Person",
          properties: {
            name: "string",
          },
        },
      ],
    });

    beforeEach(function (this: RealmObjectContext<Person>) {
      this.object = this.realm.write(() => {
        return this.realm.create<Person>("Person", { name: "Alice" });
      });
    });

    it("is observable", function (this: RealmObjectContext<Person>) {
      expectObservableMethods(this.realm.objects("Person"));
    });

    it("calls listener initially", async function (this: RealmObjectContext<Person>) {
      const collection = this.realm.objects("Person");
      await expectCollectionNotifications(collection, [
        {
          deletions: [],
          insertions: [],
          newModifications: [],
          oldModifications: [],
        },
      ]);
    });

    it("calls listener", async function (this: RealmObjectContext<Person>) {
      const collection = this.realm.objects("Person");
      const completion = expectCollectionNotifications(collection, [
        {
          deletions: [],
          insertions: [],
          newModifications: [],
          oldModifications: [],
        },
        {
          deletions: [],
          insertions: [],
          newModifications: [0],
          oldModifications: [0],
        },
      ]);

      this.realm.write(() => {
        this.object.name = "Bob";
      });

      await completion;
    });

    it("removes listeners", async function (this: RealmObjectContext<Person>) {
      const collection = this.realm.objects("Person");
      const handle = createPromiseHandle();

      const listener = createListenerStub(
        handle,
        () => {
          this.realm.write(() => {
            this.object.name = "Bob";
          });
        },
        () => {
          collection.removeListener(listener);
          this.realm.write(() => {
            this.object.name = "Charlie";
          });
        },
      );

      collection.addListener(listener);

      await handle;
    });

    it("removes all listeners", async function (this: RealmObjectContext<Person>) {
      const collection = this.realm.objects("Person");
      const handle = createPromiseHandle();

      const listener = createListenerStub(
        handle,
        () => {
          this.realm.write(() => {
            this.object.name = "Bob";
          });
        },
        () => {
          // Remove all listeners and trigger a change
          collection.removeAllListeners();
          this.realm.write(() => {
            this.object.name = "Charlie";
          });
        },
      );

      collection.addListener(listener);

      await handle;
    });
  });

  describe("List", () => {
    type Person = { name: string; friends: Realm.List<Person> };
    openRealmBeforeEach({
      schema: [
        {
          name: "Person",
          properties: {
            name: "string",
            friends: { type: "list", objectType: "Person" },
          },
        },
      ],
    });

    beforeEach(function (this: RealmObjectContext<Person>) {
      this.object = this.realm.write(() => {
        const alice = this.realm.create<Person>("Person", { name: "Alice" });
        const bob = this.realm.create<Person>("Person", { name: "Bob" });
        const charlie = this.realm.create<Person>("Person", { name: "Charlie" });
        alice.friends.push(bob, charlie);
        return alice;
      });
    });

    it("is observable", function (this: RealmObjectContext<Person>) {
      expectObservableMethods(this.object.friends);
    });

    it("calls listener initially", async function (this: RealmObjectContext<Person>) {
      const collection = this.object.friends;
      await expectCollectionNotifications(collection, [
        {
          deletions: [],
          insertions: [],
          newModifications: [],
          oldModifications: [],
        },
      ]);
    });

    it("calls listener", async function (this: RealmObjectContext<Person>) {
      const collection = this.object.friends;
      const completion = expectCollectionNotifications(collection, [
        {
          deletions: [],
          insertions: [],
          newModifications: [],
          oldModifications: [],
        },
        {
          deletions: [],
          insertions: [],
          newModifications: [1],
          oldModifications: [1],
        },
      ]);

      this.realm.write(() => {
        collection[1].name = "Diana";
        delete collection[0];
      });

      await completion;
    });

    it("removes listeners", async function (this: RealmObjectContext<Person>) {
      const collection = this.object.friends;
      const handle = createPromiseHandle();

      const listener = createListenerStub(
        handle,
        () => {
          this.realm.write(() => {
            collection[0].name = "Bobby";
          });
        },
        () => {
          collection.removeListener(listener);
          this.realm.write(() => {
            collection[0].name = "Charlotte";
          });
        },
      );

      collection.addListener(listener);

      await handle;
    });

    it("removes all listeners", async function (this: RealmObjectContext<Person>) {
      const collection = this.object.friends;
      const handle = createPromiseHandle();

      const listener = createListenerStub(
        handle,
        () => {
          this.realm.write(() => {
            collection[0].name = "Charles";
          });
        },
        () => {
          // Remove all listeners and trigger a change
          collection.removeAllListeners();
          this.realm.write(() => {
            collection[0].name = "Charlotte";
          });
        },
      );

      collection.addListener(listener);

      await handle;
    });
  });

  describe("Set", () => {
    type Person = { name: string; friends: Realm.Set<Person> };
    openRealmBeforeEach({
      schema: [
        {
          name: "Person",
          properties: {
            name: "string",
            friends: { type: "set", objectType: "Person" },
          },
        },
      ],
    });

    beforeEach(function (this: RealmObjectContext<Person>) {
      this.object = this.realm.write(() => {
        const alice = this.realm.create<Person>("Person", { name: "Alice" });
        const bob = this.realm.create<Person>("Person", { name: "Bob" });
        alice.friends.add(bob);
        return alice;
      });
    });

    it("is observable", function (this: RealmObjectContext<Person>) {
      expectObservableMethods(this.object.friends);
    });

    it("calls listener initially", async function (this: RealmObjectContext<Person>) {
      const collection = this.object.friends;
      await expectCollectionNotifications(collection, [
        {
          deletions: [],
          insertions: [],
          oldModifications: [],
          newModifications: [],
        },
      ]);
    });

    it("calls listener", async function (this: RealmObjectContext<Person>) {
      const collection = this.object.friends;
      const completion = expectCollectionNotifications(collection, [
        {
          deletions: [],
          insertions: [],
          oldModifications: [],
          newModifications: [],
        },
        {
          deletions: [],
          insertions: [0],
          oldModifications: [],
          newModifications: [],
        },
      ]);

      this.realm.write(() => {
        // collection["bob"].name = "Bobby";
        // TODO: It seems we cannot trigger a notification when a property value changes.
        collection.add(this.object);
      });

      await completion;
    });

    it("removes listeners", async function (this: RealmObjectContext<Person>) {
      const collection = this.object.friends;
      const handle = createPromiseHandle();

      const listener = createListenerStub(
        handle,
        () => {
          this.realm.write(() => {
            collection.add(this.object);
          });
        },
        () => {
          collection.removeListener(listener);
          this.realm.write(() => {
            collection.delete(this.object);
          });
        },
      );

      collection.addListener(listener);

      await handle;
    });

    it("removes all listeners", async function (this: RealmObjectContext<Person>) {
      const collection = this.object.friends;
      const handle = createPromiseHandle();

      const listener = createListenerStub(
        handle,
        () => {
          this.realm.write(() => {
            collection.add(this.object);
          });
        },
        () => {
          // Remove all listeners and trigger a change
          collection.removeAllListeners();
          this.realm.write(() => {
            collection.delete(this.object);
          });
        },
      );

      collection.addListener(listener);

      await handle;
    });
  });

  describe("Dictionary", () => {
    type Person = { name: string; friendsByName: Realm.Dictionary<Person> };
    openRealmBeforeEach({
      schema: [
        {
          name: "Person",
          properties: {
            name: "string",
            friendsByName: { type: "dictionary", objectType: "Person" },
          },
        },
      ],
    });

    beforeEach(function (this: RealmObjectContext<Person>) {
      this.object = this.realm.write(() => {
        const alice = this.realm.create<Person>("Person", { name: "Alice" });
        const bob = this.realm.create<Person>("Person", { name: "Bob" });
        alice.friendsByName.set({ bob });
        return alice;
      });
    });

    it("is observable", function (this: RealmObjectContext<Person>) {
      expectObservableMethods(this.object.friendsByName);
    });

    it("calls listener initially", async function (this: RealmObjectContext<Person>) {
      const collection = this.object.friendsByName;
      await expectDictionaryNotifications(collection, [
        {
          deletions: [],
          insertions: [],
          modifications: [],
        },
      ]);
    });

    it("calls listener", async function (this: RealmObjectContext<Person>) {
      const collection = this.object.friendsByName;
      const completion = expectDictionaryNotifications(collection, [
        {
          deletions: [],
          insertions: [],
          modifications: [],
        },
        {
          deletions: [],
          insertions: [],
          modifications: ["bob"],
        },
      ]);

      this.realm.write(() => {
        // collection["bob"].name = "Bobby";
        // TODO: It seems we cannot trigger a notification when a property value changes.
        collection["bob"] = this.object;
      });

      await completion;
    });

    it("removes listeners", async function (this: RealmObjectContext<Person>) {
      const collection = this.object.friendsByName;
      const handle = createPromiseHandle();

      const listener = createListenerStub(
        handle,
        () => {
          this.realm.write(() => {
            collection["bob"] = this.object;
          });
        },
        () => {
          collection.removeListener(listener);
          this.realm.write(() => {
            collection["bob"] = this.object;
          });
        },
      );

      collection.addListener(listener);

      await handle;
    });

    it("removes all listeners", async function (this: RealmObjectContext<Person>) {
      const collection = this.object.friendsByName;
      const handle = createPromiseHandle();

      const listener = createListenerStub(
        handle,
        () => {
          this.realm.write(() => {
            collection["bob"] = this.object;
          });
        },
        () => {
          // Remove all listeners and trigger a change
          collection.removeAllListeners();
          this.realm.write(() => {
            collection["bob"] = this.object;
          });
        },
      );

      collection.addListener(listener);

      await handle;
    });
  });
});
