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

import Realm, { CollectionChangeSet, DictionaryChangeSet, ObjectChangeSet, RealmEventName } from "realm";

import { openRealmBeforeEach } from "../hooks";
import { createListenerStub } from "../utils/listener-stub";
import { createPromiseHandle } from "../utils/promise-handle";
import { sequence } from "../utils/sequence";

type Observable = Realm | Realm.Object<any> | Realm.Results<any> | Realm.List<any> | Realm.Dictionary | Realm.Set<any>;

function expectObservableMethods(observable: Observable) {
  expect(observable.addListener).to.be.a("function");
  expect(observable.removeListener).to.be.a("function");
  expect(observable.removeAllListeners).to.be.a("function");
}

type Action = () => void;
type ChangeAndActions<ChangeSet extends object> = { expectedChange: ChangeSet; actions: Action[] };

/**
 * Transforms an array of changeset objects and actions into an array of objects for each changeset with all actions which immediately proceed it.
 */
function inlineActions<ChangeSet extends object>(changesAndActions: (ChangeSet | Action)[]) {
  const initialActions: Action[] = [];
  const changes: ChangeAndActions<ChangeSet>[] = [];

  for (const changeOrAction of changesAndActions) {
    if (typeof changeOrAction === "function") {
      if (changes.length > 0) {
        const current = changes[changes.length - 1];
        current.actions.push(changeOrAction);
      } else {
        initialActions.push(changeOrAction);
      }
    } else {
      changes.push({ expectedChange: changeOrAction, actions: [] });
    }
  }

  return { initialActions, changes };
}

/**
 * Calls a list of functions in separate ticks
 */
function performActions(actions: Action[]) {
  for (const action of actions) {
    // Using separate ticks to let the calling function return early
    setImmediate(action);
  }
}

type RealmChangeSet = { schema?: Realm.CanonicalObjectSchema[] };

function expectRealmNotifications(
  realm: Realm,
  eventName: RealmEventName,
  changesAndActions: (Action | RealmChangeSet)[],
) {
  const handle = createPromiseHandle();

  const { initialActions, changes } = inlineActions(changesAndActions);
  performActions(initialActions);

  realm.addListener(
    eventName,
    createListenerStub(
      handle,
      ...changes.map(
        ({ expectedChange }, c) =>
          (realm: Realm, name: string, schema?: Realm.CanonicalObjectSchema[]) => {
            expect(realm).instanceOf(Realm);
            expect(name).equals(eventName, `Realm change event #${c} name didn't match`);
            expect(schema).deep.equals(expectedChange.schema, `Realm change event #${c} schema didn't match`);
          },
      ),
    ),
  );
  return handle;
}

function expectObjectNotifications<T>(object: Realm.Object<T>, changesAndActions: (Action | ObjectChangeSet<T>)[]) {
  const handle = createPromiseHandle();

  const { initialActions, changes } = inlineActions(changesAndActions);
  performActions(initialActions);

  object.addListener(
    createListenerStub(
      handle,
      ...changes.map(({ expectedChange, actions }, c) => (_: Realm.Object<T>, actualChange: ObjectChangeSet<T>) => {
        expect(actualChange).deep.equals(expectedChange, `Changeset #${c} didn't match`);
        performActions(actions);
      }),
    ),
  );
  return handle;
}

function expectCollectionNotifications(
  collection: Realm.Collection,
  changesAndActions: (Action | CollectionChangeSet)[],
) {
  const handle = createPromiseHandle();

  const { initialActions, changes } = inlineActions(changesAndActions);
  performActions(initialActions);

  collection.addListener(
    createListenerStub(
      handle,
      ...changes.map(({ expectedChange, actions }, c) => (_: Realm.Collection, actualChange: CollectionChangeSet) => {
        expect(actualChange).deep.equals(expectedChange, `Changeset #${c} didn't match`);
        performActions(actions);
      }),
    ),
  );
  return handle;
}

function expectDictionaryNotifications(
  dictionary: Realm.Dictionary,
  changesAndActions: (Action | DictionaryChangeSet)[],
) {
  const handle = createPromiseHandle();

  const { initialActions, changes } = inlineActions(changesAndActions);
  performActions(initialActions);

  dictionary.addListener(
    createListenerStub(
      handle,
      ...changes.map(({ expectedChange, actions }, c) => (_: Realm.Dictionary, actualChange: DictionaryChangeSet) => {
        expect(actualChange).deep.equals(expectedChange, `Changeset #${c} didn't match`);
        performActions(actions);
      }),
    ),
  );
  return handle;
}

type ListenerRemovalOptions = {
  addListener: (callback: () => void) => void;
  removeListener: (callback: () => void) => void;
  update: () => void;
};

/**
 * Adds a listener, triggers an update which removes the listener and triggers another update,
 * expecting (through the use of a listener stub) that update to not call the listener again.
 */
async function expectListenerRemoval({ addListener, removeListener, update }: ListenerRemovalOptions) {
  const handle = createPromiseHandle();
  const listener = createListenerStub(handle, () => {
    removeListener(listener);
    setImmediate(() => {
      update();
    });
  });
  addListener(listener);
  update();
  await handle;
}

describe("Observable", () => {
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
        const completion = expectRealmNotifications(this.realm, "change", [
          () => {
            this.realm.write(() => {
              this.realm.create("Person", { name: "Alice" });
            });
          },
          {},
        ]);

        await completion;
      });

      it("removes listeners", async function (this: RealmContext) {
        await expectListenerRemoval({
          addListener: (listener) => this.realm.addListener("change", listener),
          removeListener: (listener) => this.realm.removeListener("change", listener),
          update: () => {
            this.realm.write(() => {
              this.realm.create("Person", { name: "Bob" });
            });
          },
        });
      });

      it("removes all listeners", async function (this: RealmContext) {
        await expectListenerRemoval({
          addListener: (listener) => this.realm.addListener("change", listener),
          removeListener: () => this.realm.removeAllListeners("change"),
          update: () => {
            this.realm.write(() => {
              this.realm.create("Person", { name: "Bob" });
            });
          },
        });
      });
    });

    describe("beforenotify", () => {
      // Skipping on React Native because the callback is called one too many times
      it.skipIf(environment.reactNative, "calls listener", async function (this: RealmContext) {
        await expectRealmNotifications(this.realm, "beforenotify", [
          () => {
            this.realm.write(() => {
              this.realm.create("Person", { name: "Alice" });
            });
          },
          {},
        ]);
      });

      it("removes listeners", async function (this: RealmContext) {
        await expectListenerRemoval({
          addListener: (listener) => this.realm.addListener("beforenotify", listener),
          removeListener: (listener) => this.realm.removeListener("beforenotify", listener),
          update: () => {
            this.realm.write(() => {
              this.realm.create("Person", { name: "Bob" });
            });
          },
        });
      });

      it("removes all listeners", async function (this: RealmContext) {
        await expectListenerRemoval({
          addListener: (listener) => this.realm.addListener("beforenotify", listener),
          removeListener: () => this.realm.removeAllListeners("beforenotify"),
          update: () => {
            this.realm.write(() => {
              this.realm.create("Person", { name: "Bob" });
            });
          },
        });
      });
    });

    describe("schema", () => {
      type InternalRealmContext = RealmContext & {
        realm: Realm & { _updateSchema(schema: Realm.ObjectSchema[]): void };
      };

      it("calls listener", async function (this: InternalRealmContext) {
        await expectRealmNotifications(this.realm, "schema", [
          () => {
            this.realm.write(() => {
              this.realm._updateSchema([{ name: "Person", properties: { name: "string" } }]);
            });
          },
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
      });

      it("removes listeners", async function (this: InternalRealmContext) {
        await expectListenerRemoval({
          addListener: (listener) => this.realm.addListener("schema", listener),
          removeListener: (listener) => this.realm.removeListener("schema", listener),
          update: () => {
            this.realm.write(() => {
              this.realm._updateSchema([{ name: "Person", properties: { name: "string" } }]);
            });
          },
        });
      });

      it("removes all listeners", async function (this: InternalRealmContext) {
        await expectListenerRemoval({
          addListener: (listener) => this.realm.addListener("schema", listener),
          removeListener: () => this.realm.removeAllListeners("schema"),
          update: () => {
            this.realm.write(() => {
              this.realm._updateSchema([{ name: "Person", properties: { name: "string" } }]);
            });
          },
        });
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
      await expectObjectNotifications(this.object, [
        { deleted: false, changedProperties: [] },
        () => {
          this.realm.write(() => {
            this.object.name = "Bob";
          });
        },
        { deleted: false, changedProperties: ["name"] },
      ]);
    });

    it("removes listeners", async function (this: RealmObjectContext<Person>) {
      await expectListenerRemoval({
        addListener: (listener) => this.object.addListener(listener),
        removeListener: (listener) => this.object.removeListener(listener),
        update: () => {
          this.realm.write(() => {
            this.object.name = "Charlie";
          });
        },
      });
    });

    it("removes all listeners", async function (this: RealmObjectContext<Person>) {
      await expectListenerRemoval({
        addListener: (listener) => this.object.addListener(listener),
        removeListener: () => this.object.removeAllListeners(),
        update: () => {
          this.realm.write(() => {
            this.object.name = "Charlie";
          });
        },
      });
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
      await expectCollectionNotifications(collection, [
        {
          deletions: [],
          insertions: [],
          newModifications: [],
          oldModifications: [],
        },
        () => {
          this.realm.write(() => {
            this.object.name = "Bob";
          });
        },
        {
          deletions: [],
          insertions: [],
          newModifications: [0],
          oldModifications: [0],
        },
      ]);
    });

    it("removes listeners", async function (this: RealmObjectContext<Person>) {
      const collection = this.realm.objects("Person");
      await expectListenerRemoval({
        addListener: (listener) => collection.addListener(listener),
        removeListener: (listener) => collection.removeListener(listener),
        update: () => {
          this.realm.write(() => {
            this.object.name = "Charlie";
          });
        },
      });
    });

    it("removes all listeners", async function (this: RealmObjectContext<Person>) {
      const collection = this.realm.objects("Person");
      await expectListenerRemoval({
        addListener: (listener) => collection.addListener(listener),
        removeListener: () => collection.removeAllListeners(),
        update: () => {
          this.realm.write(() => {
            this.object.name = "Charlie";
          });
        },
      });
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
        () => {
          this.realm.write(() => {
            collection[1].name = "Diana";
            delete collection[0];
          });
        },
        {
          deletions: [],
          insertions: [],
          newModifications: [1],
          oldModifications: [1],
        },
      ]);

      await completion;
    });

    it("removes listeners", async function (this: RealmObjectContext<Person>) {
      const collection = this.object.friends;
      await expectListenerRemoval({
        addListener: (listener) => collection.addListener(listener),
        removeListener: (listener) => collection.removeListener(listener),
        update: () => {
          this.realm.write(() => {
            collection[0].name = "Bobby";
          });
        },
      });
    });

    it("removes all listeners", async function (this: RealmObjectContext<Person>) {
      const collection = this.object.friends;
      await expectListenerRemoval({
        addListener: (listener) => collection.addListener(listener),
        removeListener: () => collection.removeAllListeners(),
        update: () => {
          this.realm.write(() => {
            collection[0].name = "Bobby";
          });
        },
      });
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
        () => {
          this.realm.write(() => {
            // collection["bob"].name = "Bobby";
            // TODO: It seems we cannot trigger a notification when a property value changes.
            collection.add(this.object);
          });
        },
        {
          deletions: [],
          insertions: [0],
          oldModifications: [],
          newModifications: [],
        },
      ]);

      await completion;
    });

    it("removes listeners", async function (this: RealmObjectContext<Person>) {
      const collection = this.object.friends;
      await expectListenerRemoval({
        addListener: (listener) => collection.addListener(listener),
        removeListener: (listener) => collection.removeListener(listener),
        update: sequence(
          () => {
            this.realm.write(() => {
              collection.add(this.object);
            });
          },
          () => {
            this.realm.write(() => {
              collection.delete(this.object);
            });
          },
        ),
      });
    });

    it("removes all listeners", async function (this: RealmObjectContext<Person>) {
      const collection = this.object.friends;
      await expectListenerRemoval({
        addListener: (listener) => collection.addListener(listener),
        removeListener: () => collection.removeAllListeners(),
        update: sequence(
          () => {
            this.realm.write(() => {
              collection.add(this.object);
            });
          },
          () => {
            this.realm.write(() => {
              collection.delete(this.object);
            });
          },
        ),
      });
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
        () => {
          this.realm.write(() => {
            // collection["bob"].name = "Bobby";
            // TODO: It seems we cannot trigger a notification when a property value changes.
            collection["bob"] = this.object;
          });
        },
        {
          deletions: [],
          insertions: [],
          modifications: ["bob"],
        },
      ]);

      await completion;
    });

    it("removes listeners", async function (this: RealmObjectContext<Person>) {
      const collection = this.object.friendsByName;
      await expectListenerRemoval({
        addListener: (listener) => collection.addListener(listener),
        removeListener: (listener) => collection.removeListener(listener),
        update: () => {
          this.realm.write(() => {
            collection["bob"] = this.object;
          });
        },
      });
    });

    it("removes all listeners", async function (this: RealmObjectContext<Person>) {
      const collection = this.object.friendsByName;
      await expectListenerRemoval({
        addListener: (listener) => collection.addListener(listener),
        removeListener: () => collection.removeAllListeners(),
        update: () => {
          this.realm.write(() => {
            collection["bob"] = this.object;
          });
        },
      });
    });
  });
});
