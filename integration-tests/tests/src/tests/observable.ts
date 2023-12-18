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

import { assert, expect } from "chai";

import Realm, { CollectionChangeSet, DictionaryChangeSet, ObjectChangeSet, RealmEventName } from "realm";

import { openRealmBeforeEach } from "../hooks";
import { createListenerStub } from "../utils/listener-stub";
import { createPromiseHandle } from "../utils/promise-handle";
import { sequence } from "../utils/sequence";

const EMPTY_OBJECT_CHANGESET: Realm.ObjectChangeSet<unknown> = { deleted: false, changedProperties: [] };

const EMPTY_COLLECTION_CHANGESET: Realm.CollectionChangeSet = {
  deletions: [],
  insertions: [],
  newModifications: [],
  oldModifications: [],
};

const EMPTY_DICTIONARY_CHANGESET: Realm.DictionaryChangeSet = {
  deletions: [],
  insertions: [],
  modifications: [],
};

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

type ChangeSetAsserter<ChangeSet, Args extends unknown[]> = (
  expectedChange: ChangeSet,
  index: number,
) => (...args: Args) => void;

/**
 * Reusable utility which will add a listener, perform a sequence of actions and assertions of expected changesets.
 * For every changeset a call of the listener will be expected, after which all subsequent actions will be scheduled for execution in the upcoming tick.
 * There is a small delay after the assertion of the last changeset to the returned promise gets resolved, to ensure that no unwanted notifications are fired.
 * @param addListener Called when a listener needs to be added
 * @param removeListener Called when a listener needs to be removed
 * @param asserter Called when a changeset needs to be asserted / validated
 * @param changesAndActions An array of actions (i.e. functions) to execute and changeset objects to assert.
 */
async function expectNotifications<ChangeSet extends object, Args extends unknown[]>(
  addListener: (listener: (...args: Args) => void) => void,
  removeListener: (listener: (...args: Args) => void) => void,
  asserter: ChangeSetAsserter<ChangeSet, Args>,
  changesAndActions: (Action | ChangeSet)[],
) {
  const handle = createPromiseHandle();

  const { initialActions, changes } = inlineActions(changesAndActions);

  const listener = createListenerStub(
    handle,
    ...changes.map(({ expectedChange, actions }, changeIndex) => (...args: Args) => {
      asserter(expectedChange, changeIndex)(...args);
      performActions(actions);
    }),
  );

  addListener(listener);
  performActions(initialActions);

  handle.finally(() => {
    removeListener(listener);
  });

  await handle;
}

type RealmChangeSet = { schema?: Realm.CanonicalObjectSchema[] };

/**
 * Expect a list of changesets to a Realm.
 * @see {@link expectNotifications} for details on the {@link changesAndActions} argument.
 */
async function expectRealmNotifications(
  realm: Realm,
  eventName: RealmEventName,
  changesAndActions: (Action | RealmChangeSet)[],
) {
  await expectNotifications(
    (listener) => realm.addListener(eventName, listener),
    (listener) => realm.removeListener(eventName, listener),
    (expectedChange, c) => (realm: Realm, name: string, schema?: Realm.CanonicalObjectSchema[]) => {
      expect(realm).instanceOf(Realm);
      expect(name).equals(eventName, `Realm change event #${c} name didn't match`);
      expect(schema).deep.equals(expectedChange.schema, `Realm change event #${c} schema didn't match`);
    },
    changesAndActions,
  );
}

/**
 * Expect a list of changesets to a Realm.Object.
 * @see {@link expectNotifications} for details on the {@link changesAndActions} argument.
 */
async function expectObjectNotifications<T>(
  object: Realm.Object<T>,
  keyPaths: undefined | string | string[],
  changesAndActions: (Action | ObjectChangeSet<T>)[],
) {
  await expectNotifications(
    (listener) => object.addListener(listener, keyPaths),
    (listener) => object.removeListener(listener),
    (expectedChange, c) => (_: Realm.Object<T>, actualChange: ObjectChangeSet<T>) => {
      expect(actualChange).deep.equals(expectedChange, `Changeset #${c} didn't match`);
    },
    changesAndActions,
  );
}

/**
 * Expect a list of changesets to a Realm.Collection.
 * @see {@link expectNotifications} for details on the {@link changesAndActions} argument.
 */
async function expectCollectionNotifications(
  collection: Realm.Collection,
  keyPaths: undefined | string | string[],
  changesAndActions: (Action | CollectionChangeSet)[],
) {
  await expectNotifications(
    (listener) => collection.addListener(listener, keyPaths),
    (listener) => collection.removeListener(listener),
    (expectedChange, c) => (_: Realm.Collection, actualChange: CollectionChangeSet) => {
      expect(actualChange).deep.equals(expectedChange, `Changeset #${c} didn't match`);
    },
    changesAndActions,
  );
}

/**
 * Expect a list of changesets to a Realm.Dictionary.
 * @see {@link expectNotifications} for details on the {@link changesAndActions} argument.
 */
async function expectDictionaryNotifications(
  dictionary: Realm.Dictionary,
  keyPaths: undefined | string | string[],
  changesAndActions: (Action | DictionaryChangeSet)[],
) {
  await expectNotifications(
    (listener) => dictionary.addListener(listener, keyPaths),
    (listener) => dictionary.removeListener(listener),
    (expectedChange, c) => (_: Realm.Dictionary, actualChange: DictionaryChangeSet) => {
      expect(actualChange).deep.equals(expectedChange, `Changeset #${c} didn't match`);
    },
    changesAndActions,
  );
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

function noop() {
  /* tumbleweed */
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
        await expectRealmNotifications(this.realm, "change", [
          () => {
            this.realm.write(() => {
              this.realm.create("Person", { name: "Alice" });
            });
          },
          {},
        ]);
      });

      // Skipping, because although the API would be more uniform, there is no need to throw when adding the same Realm listener twice
      it.skip("throws on listener reuse", function (this: RealmContext) {
        this.realm.addListener("change", noop);
        expect(() => {
          this.realm.addListener("change", noop);
        }).throws("Remove callback before adding it again");
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

      // Skipping, because although the API would be more uniform, there is no need to throw when adding the same Realm listener twice
      it.skip("throws on listener reuse", function (this: RealmContext) {
        this.realm.addListener("beforenotify", noop);
        expect(() => {
          this.realm.addListener("beforenotify", noop);
        }).throws("Remove callback before adding it again");
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

      // Skipping, because although the API would be more uniform, there is no need to throw when adding the same Realm listener twice
      it.skip("throws on listener reuse", function (this: RealmContext) {
        this.realm.addListener("schema", noop);
        expect(() => {
          this.realm.addListener("schema", noop);
        }).throws("Remove callback before adding it again");
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
    type Person = { name: string; age: number | undefined; friends: Realm.List<Person> };
    openRealmBeforeEach({
      schema: [
        {
          name: "Person",
          properties: {
            name: "string",
            age: "int?",
            friends: "Person[]",
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
      expectObservableMethods(this.object);
    });

    it("throws on listener reuse", function (this: RealmObjectContext<Person>) {
      this.object.addListener(noop);
      expect(() => {
        this.object.addListener(noop);
      }).throws("Remove callback before adding it again");
    });

    it("calls listener initially", async function (this: RealmObjectContext<Person>) {
      await expectObjectNotifications(this.object, undefined, [EMPTY_OBJECT_CHANGESET]);
    });

    it("calls listener initially (passing key-path as string)", async function (this: RealmObjectContext<Person>) {
      await expectObjectNotifications(this.object, "name", [EMPTY_OBJECT_CHANGESET]);
    });

    it("calls listener initially (passing key-path as array)", async function (this: RealmObjectContext<Person>) {
      await expectObjectNotifications(this.object, ["name"], [EMPTY_OBJECT_CHANGESET]);
    });

    it("calls listener", async function (this: RealmObjectContext<Person>) {
      await expectObjectNotifications(this.object, undefined, [
        EMPTY_OBJECT_CHANGESET,
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

    describe("key-path filtered", () => {
      it("calls listener only on relevant changes", async function (this: RealmObjectContext<Person>) {
        await expectObjectNotifications(
          this.object,
          ["name"],
          [
            EMPTY_OBJECT_CHANGESET,
            () => {
              // Updating the age to 42 will ensure the object doesn't leave the results
              this.realm.write(() => {
                this.object.name = "Alex";
                this.object.age = 42;
              });
            },
            {
              deleted: false,
              changedProperties: ["name"],
            },
            () => {
              // Perform a couple of changes that shouldn't trigger
              this.realm.write(() => {
                this.object.age = 64;
              });

              const lastFriend = this.realm.write(() => {
                return this.object.friends.pop();
              });
              assert(lastFriend);
              this.realm.write(() => {
                this.object.friends.push(lastFriend);
              });
            },
          ],
        );

        await expectObjectNotifications(
          this.object,
          ["friends"],
          [
            EMPTY_OBJECT_CHANGESET,
            () => {
              this.realm.write(() => {
                this.object.friends.pop();
              });
            },
            {
              deleted: false,
              changedProperties: ["friends"],
            },
            // Perform a couple of changes that shouldn't trigger
            () => {
              this.realm.write(() => {
                this.object.age = 24;
              });
              this.realm.write(() => {
                this.object.friends[0].name = "Bart";
              });
            },
          ],
        );

        await expectObjectNotifications(
          this.object,
          ["friends.name"],
          [
            EMPTY_OBJECT_CHANGESET,
            () => {
              this.realm.write(() => {
                this.object.friends[0].name = "Bobby";
              });
            },
            {
              deleted: false,
              changedProperties: ["friends"],
            },
            // Perform a couple of changes that shouldn't trigger
            () => {
              this.realm.write(() => {
                this.object.age = 24;
              });
              this.realm.write(() => {
                this.object.friends[0].age = 24;
              });
            },
          ],
        );

        await expectObjectNotifications(
          this.object,
          ["*"],
          [
            EMPTY_OBJECT_CHANGESET,
            () => {
              this.realm.write(() => {
                this.object.name = "Alice";
              });
            },
            {
              deleted: false,
              changedProperties: ["name"],
            },
            () => {
              this.realm.write(() => {
                const charles = this.realm.create<Person>("Person", { name: "Charles", age: 74 });
                this.object.friends.push(charles);
              });
            },
            {
              deleted: false,
              changedProperties: ["friends"],
            },
            // Perform a couple of changes that shouldn't trigger
            () => {
              this.realm.write(() => {
                this.object.friends[0].name = "Alex";
              });
              this.realm.write(() => {
                const daniel = this.realm.create<Person>("Person", { name: "Charles", age: 74 });
                this.object.friends[0].friends.push(daniel);
              });
            },
          ],
        );
      });

      it("combines key-paths when delivering notifications", async function (this: RealmObjectContext<Person>) {
        const completion1 = expectObjectNotifications(
          this.object,
          ["name"],
          [
            EMPTY_OBJECT_CHANGESET,
            {
              deleted: false,
              changedProperties: ["name"],
            },
            {
              deleted: false,
              changedProperties: ["age"],
            },
          ],
        );

        const completion2 = expectObjectNotifications(
          this.object,
          ["age"],
          [
            EMPTY_OBJECT_CHANGESET,
            {
              deleted: false,
              changedProperties: ["name"],
            },
            {
              deleted: false,
              changedProperties: ["age"],
            },
          ],
        );

        this.realm.write(() => {
          this.object.name = "Alex";
        });

        this.realm.write(() => {
          this.object.age = 24;
        });

        await Promise.all([completion1, completion2]);
      });
    });
  });

  describe("Results", () => {
    type Person = { name: string; age: number | undefined; friends: Realm.List<Person> };
    // change: with / without key-paths
    openRealmBeforeEach({
      schema: [
        {
          name: "Person",
          properties: {
            name: "string",
            age: "int?",
            friends: "Person[]",
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
      expectObservableMethods(this.realm.objects("Person"));
    });

    it("throws on listener reuse", function (this: RealmObjectContext<Person>) {
      const collection = this.realm.objects("Person");
      collection.addListener(noop);
      expect(() => {
        collection.addListener(noop);
      }).throws("Remove callback before adding it again");
    });

    it("calls listener initially", async function (this: RealmObjectContext<Person>) {
      await expectCollectionNotifications(this.realm.objects("Person"), undefined, [EMPTY_COLLECTION_CHANGESET]);
    });

    it("calls listener initially (passing key-path as string)", async function (this: RealmObjectContext<Person>) {
      await expectCollectionNotifications(this.realm.objects("Person"), "name", [EMPTY_COLLECTION_CHANGESET]);
    });

    it("calls listener initially (passing key-path as array)", async function (this: RealmObjectContext<Person>) {
      await expectCollectionNotifications(this.realm.objects("Person"), ["name"], [EMPTY_COLLECTION_CHANGESET]);
    });

    it("calls listener", async function (this: RealmObjectContext<Person>) {
      const collection = this.realm.objects("Person");
      await expectCollectionNotifications(collection, undefined, [
        EMPTY_COLLECTION_CHANGESET,
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

    describe("key-path filtered", () => {
      it("fires on relevant changes to a primitive", async function (this: RealmObjectContext<Person>) {
        const collection = this.realm.objects<Person>("Person").filtered("name = $0 OR age = 42", "Alice");
        await expectCollectionNotifications(
          collection,
          ["name"],
          [
            EMPTY_COLLECTION_CHANGESET,
            () => {
              // Updating the age to 42 will ensure the object doesn't leave the results
              this.realm.write(() => {
                this.object.name = "Alex";
                this.object.age = 42;
              });
            },
            {
              deletions: [],
              insertions: [],
              newModifications: [0],
              oldModifications: [0],
            },
            () => {
              // Now that nothing matches, the object will be deleted from the collection.
              this.realm.write(() => {
                this.object.name = "Alan";
                this.object.age = 24;
              });
            },
            {
              deletions: [0],
              insertions: [],
              newModifications: [],
              oldModifications: [],
            },
            () => {
              // Resetting the name, to make the object re-enter into the collection.
              this.realm.write(() => {
                this.object.name = "Alice";
              });
            },
            {
              deletions: [],
              insertions: [0],
              newModifications: [],
              oldModifications: [],
            },
            () => {
              // Perform a couple of changes that shouldn't trigger
              this.realm.write(() => {
                this.object.age = 64;
              });

              const lastFriend = this.realm.write(() => {
                return this.object.friends.pop();
              });
              assert(lastFriend);
              this.realm.write(() => {
                this.object.friends.push(lastFriend);
              });
            },
          ],
        );
      });

      it("fires on relevant changes to a list", async function (this: RealmObjectContext<Person>) {
        const collection = this.realm.objects<Person>("Person").filtered("name = $0 OR age = 42", "Alice");
        await expectCollectionNotifications(
          collection,
          ["friends"],
          [
            EMPTY_COLLECTION_CHANGESET,
            () => {
              this.realm.write(() => {
                this.object.friends.pop();
              });
            },
            {
              deletions: [],
              insertions: [],
              newModifications: [0],
              oldModifications: [0],
            },
            // Perform a couple of changes that shouldn't trigger
            () => {
              this.realm.write(() => {
                this.object.age = 24;
              });
              this.realm.write(() => {
                this.object.friends[0].name = "Bart";
              });
            },
          ],
        );
      });

      it("fires on relevant changes to a primitive of a list", async function (this: RealmObjectContext<Person>) {
        const collection = this.realm.objects<Person>("Person").filtered("name = $0 OR age = 42", "Alice");
        await expectCollectionNotifications(
          collection,
          ["friends.name"],
          [
            EMPTY_COLLECTION_CHANGESET,
            () => {
              this.realm.write(() => {
                this.object.friends[0].name = "Bobby";
              });
            },
            {
              deletions: [],
              insertions: [],
              newModifications: [0],
              oldModifications: [0],
            },
            // Perform a couple of changes that shouldn't trigger
            () => {
              this.realm.write(() => {
                this.object.age = 24;
              });
              this.realm.write(() => {
                this.object.friends[0].age = 24;
              });
            },
          ],
        );
      });

      it("fires on relevant changes to a wildcard", async function (this: RealmObjectContext<Person>) {
        const collection = this.realm.objects<Person>("Person").filtered("name = $0 OR age = 42", "Alice");
        await expectCollectionNotifications(
          collection,
          ["*"],
          [
            EMPTY_COLLECTION_CHANGESET,
            () => {
              this.realm.write(() => {
                collection[0].name = "Alice";
              });
            },
            {
              deletions: [],
              insertions: [],
              newModifications: [0],
              oldModifications: [0],
            },
            () => {
              this.realm.write(() => {
                collection[0].age = 42;
              });
            },
            {
              deletions: [],
              insertions: [],
              newModifications: [0],
              oldModifications: [0],
            },
            // Perform a couple of changes that shouldn't trigger
            () => {
              this.realm.write(() => {
                collection[0].friends[0].name = "Barney";
              });
              this.realm.write(() => {
                collection[0].friends[0].age = 34;
              });
            },
          ],
        );
      });

      it("combines key-paths when delivering notifications", async function (this: RealmObjectContext<Person>) {
        const collection = this.realm.objects<Person>("Person").filtered("name = $0 OR name = $1", "Alice", "Alex");

        const completion1 = expectCollectionNotifications(
          collection,
          ["name"],
          [
            EMPTY_COLLECTION_CHANGESET,
            {
              deletions: [],
              insertions: [],
              newModifications: [0],
              oldModifications: [0],
            },
            {
              deletions: [],
              insertions: [],
              newModifications: [0],
              oldModifications: [0],
            },
          ],
        );

        const completion2 = expectCollectionNotifications(
          collection,
          ["age"],
          [
            EMPTY_COLLECTION_CHANGESET,
            {
              deletions: [],
              insertions: [],
              newModifications: [0],
              oldModifications: [0],
            },
            {
              deletions: [],
              insertions: [],
              newModifications: [0],
              oldModifications: [0],
            },
          ],
        );

        this.realm.write(() => {
          this.object.name = "Alex";
        });

        this.realm.write(() => {
          this.object.age = 24;
        });

        await Promise.all([completion1, completion2]);
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

    it("throws on listener reuse", function (this: RealmObjectContext<Person>) {
      const collection = this.object.friends;
      collection.addListener(noop);
      expect(() => {
        collection.addListener(noop);
      }).throws("Remove callback before adding it again");
    });

    it("calls listener initially", async function (this: RealmObjectContext<Person>) {
      await expectCollectionNotifications(this.object.friends, undefined, [EMPTY_COLLECTION_CHANGESET]);
    });

    it("calls listener initially (passing key-path as string)", async function (this: RealmObjectContext<Person>) {
      await expectCollectionNotifications(this.object.friends, "name", [EMPTY_COLLECTION_CHANGESET]);
    });

    it("calls listener initially (passing key-path as array)", async function (this: RealmObjectContext<Person>) {
      await expectCollectionNotifications(this.object.friends, ["name"], [EMPTY_COLLECTION_CHANGESET]);
    });

    it("calls listener", async function (this: RealmObjectContext<Person>) {
      const collection = this.object.friends;
      const completion = expectCollectionNotifications(collection, undefined, [
        EMPTY_COLLECTION_CHANGESET,
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

    it("throws on listener reuse", function (this: RealmObjectContext<Person>) {
      const collection = this.object.friends;
      collection.addListener(noop);
      expect(() => {
        collection.addListener(noop);
      }).throws("Remove callback before adding it again");
    });

    it("calls listener initially", async function (this: RealmObjectContext<Person>) {
      await expectCollectionNotifications(this.object.friends, undefined, [EMPTY_COLLECTION_CHANGESET]);
    });

    it("calls listener initially (passing key-path as string)", async function (this: RealmObjectContext<Person>) {
      await expectCollectionNotifications(this.object.friends, "name", [EMPTY_COLLECTION_CHANGESET]);
    });

    it("calls listener initially (passing key-path as array)", async function (this: RealmObjectContext<Person>) {
      await expectCollectionNotifications(this.object.friends, ["name"], [EMPTY_COLLECTION_CHANGESET]);
    });

    it("calls listener", async function (this: RealmObjectContext<Person>) {
      const collection = this.object.friends;
      await expectCollectionNotifications(collection, undefined, [
        EMPTY_COLLECTION_CHANGESET,
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
        bob.friendsByName.set({ alice });
        return alice;
      });
    });

    it("is observable", function (this: RealmObjectContext<Person>) {
      expectObservableMethods(this.object.friendsByName);
    });

    it("throws on listener reuse", function (this: RealmObjectContext<Person>) {
      const collection = this.object.friendsByName;
      collection.addListener(noop);
      expect(() => {
        collection.addListener(noop);
      }).throws("Remove callback before adding it again");
    });

    it("calls listener initially", async function (this: RealmObjectContext<Person>) {
      await expectDictionaryNotifications(this.object.friendsByName, undefined, [EMPTY_DICTIONARY_CHANGESET]);
    });

    it("calls listener initially (passing key-path as string)", async function (this: RealmObjectContext<Person>) {
      await expectDictionaryNotifications(this.object.friendsByName, "name", [EMPTY_DICTIONARY_CHANGESET]);
    });

    it("calls listener initially (passing key-path as array)", async function (this: RealmObjectContext<Person>) {
      await expectDictionaryNotifications(this.object.friendsByName, ["name"], [EMPTY_DICTIONARY_CHANGESET]);
    });

    it("calls listener", async function (this: RealmObjectContext<Person>) {
      const collection = this.object.friendsByName;
      await expectDictionaryNotifications(collection, undefined, [
        EMPTY_DICTIONARY_CHANGESET,
        () => {
          this.realm.write(() => {
            collection["bob"].name = "Bobby";
          });
        },
        {
          deletions: [],
          insertions: [],
          modifications: ["bob"],
        },
      ]);
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

    describe("key-path filtered listeners", () => {
      it("fires on relevant changes to a primitive", async function (this: RealmObjectContext<Person>) {
        const alice = this.object;
        const [bob] = this.realm.objects<Person>("Person").filtered("name = $0", "Bob");
        assert(bob);

        const collection = this.object.friendsByName;
        await expectDictionaryNotifications(
          collection,
          ["name"],
          [
            EMPTY_DICTIONARY_CHANGESET,
            () => {
              this.realm.write(() => {
                bob.name = "Bobby";
              });
            },
            {
              deletions: [],
              insertions: [],
              modifications: ["bob"],
            },
            () => {
              // Let's make alice befriend herself
              this.realm.write(() => {
                this.object.friendsByName["alice"] = alice;
              });
            },
            {
              deletions: [],
              insertions: ["alice"],
              modifications: [],
            },
            () => {
              this.realm.write(() => {
                delete this.object.friendsByName["bob"];
              });
            },
            {
              deletions: ["bob"],
              insertions: [],
              modifications: [],
            },
            () => {
              // Perform a couple of changes that shouldn't trigger
              this.realm.write(() => {
                assert(bob);
                bob.name = "Bart";
              });
            },
          ],
        );
      });

      it("fires on relevant changes to a nested dictionary entry's primitive", async function (this: RealmObjectContext<Person>) {
        const [bob] = this.realm.objects<Person>("Person").filtered("name = $0", "Bob");
        assert(bob);

        const collection = this.object.friendsByName;
        await expectDictionaryNotifications(
          collection,
          ["friendsByName.name"],
          [
            EMPTY_DICTIONARY_CHANGESET,
            () => {
              this.realm.write(() => {
                this.object.friendsByName["bob"].friendsByName["alice"].name = "Alex";
              });
            },
            {
              deletions: [],
              insertions: [],
              modifications: ["bob"],
            },
            () => {
              this.realm.write(() => {
                delete this.object.friendsByName["bob"];
              });
            },
            {
              deletions: ["bob"],
              insertions: [],
              modifications: [],
            },
            // Perform a couple of changes that shouldn't trigger
            () => {
              this.realm.write(() => {
                this.object.name = "Alice";
              });
              this.realm.write(() => {
                bob.name = "Bobby";
              });
            },
          ],
        );
      });
    });
  });
});
