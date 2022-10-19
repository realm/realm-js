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

import { expect } from "chai";

import { CollectionChangeSet, ObjectChangeSet, Realm, Results } from "../index";
import { RealmContext, closeRealm, generateTempRealmPath } from "./utils";

describe("Milestone #3", () => {
  describe("Register a listener on an object and get notified of changes", () => {
    beforeEach(function (this: RealmContext) {
      this.realm = new Realm({
        path: generateTempRealmPath(),
        inMemory: true,
        schema: [{ name: "Person", properties: { name: "string" } }],
      });
    });
    afterEach(closeRealm);

    it("fires initially", async function (this: RealmContext) {
      const alice = this.realm.write(() => this.realm.create("Person", { name: "Alice" }));
      await new Promise<void>((resolve) => {
        alice.addListener((object, changes) => {
          expect(object).deep.equals(alice);
          expect(changes.deleted).equals(false);
          expect(changes.changedProperties.length).equals(0);
          resolve();
        });
      });
    });

    it("fires on change", async function (this: RealmContext) {
      const alice = this.realm.write(() => this.realm.create("Person", { name: "Alice" }));
      let calls = 0;
      await new Promise<void>((resolve) => {
        alice.addListener((object, changes) => {
          if (calls === 0) {
            calls++;
            expect(object).deep.equals(alice);
            expect(changes.deleted).equals(false);
            expect(changes.changedProperties.length).equals(0);
            // Update the name to trigger another event
            this.realm.write(() => (alice.name = "Alison"));
          } else if (calls === 1) {
            calls++;
            expect(object).deep.equals(alice);
            expect(changes.deleted).equals(false);
            expect(changes.changedProperties).deep.equals(["name"]);
            expect(object.name).equals("Alison");
            resolve();
          } else {
            throw new Error(`Unexpected number of calls (${calls})`);
          }
        });
      });
    });

    it("fires on deletion", async function (this: RealmContext) {
      const alice = this.realm.write(() => this.realm.create("Person", { name: "Alice" }));
      let calls = 0;
      await new Promise<void>((resolve) => {
        alice.addListener((object, changes) => {
          if (calls === 0) {
            calls++;
            expect(object).deep.equals(alice);
            expect(changes.deleted).equals(false);
            expect(changes.changedProperties.length).equals(0);
            // Delete the object to trigger another event
            this.realm.write(() => this.realm.delete(alice));
          } else if (calls === 1) {
            calls++;
            expect(object.isValid()).equals(false);
            expect(alice.isValid()).equals(false);
            expect(changes.deleted).equals(true);
            expect(changes.changedProperties.length).equals(0);
            resolve();
          } else {
            throw new Error(`Unexpected number of calls (${calls})`);
          }
        });
      });
    });

    it("doesn't fire if removed", async function (this: RealmContext) {
      const { realm } = this;
      const alice = realm.write(() => realm.create("Person", { name: "Alice" }));
      let calls = 0;
      await new Promise<void>((resolve, reject) => {
        function callback(object: typeof alice, changes: ObjectChangeSet<unknown>) {
          if (calls === 0) {
            // Initial fire
            calls++;
            expect(object).deep.equals(alice);
            expect(changes.deleted).equals(false);
            expect(changes.changedProperties.length).equals(0);
            // Remove the listener
            alice.removeListener(callback);
            // Update the name to trigger another event
            realm.write(() => (alice.name = "Alison"));
            // Wait a bit to allow for an async update to trigger a rejection first
            setTimeout(resolve);
          } else {
            const err = new Error(`Unexpected number of calls (${calls})`);
            reject(err);
          }
        }
        alice.addListener(callback);
      });
    });

    it("doesn't fire if all are removed", async function (this: RealmContext) {
      const { realm } = this;
      const alice = realm.write(() => realm.create("Person", { name: "Alice" }));
      let fooCalls = 0;
      let barCalls = 0;
      await Promise.all([
        new Promise<void>((resolve) => {
          function foo() {
            fooCalls++;
            // Remove the listener
            alice.removeListener(foo);
            // Update the name to trigger another event
            realm.write(() => (alice.name = "Alison"));
            resolve();
          }
          alice.addListener(foo);
        }),
        new Promise<void>((resolve) => {
          function bar() {
            barCalls++;
            if (barCalls === 2) {
              // Remove the listener
              alice.removeAllListeners();
              resolve();
            }
          }
          alice.addListener(bar);
        }),
      ]);
      expect(fooCalls).equals(1);
      expect(barCalls).equals(2);
      // Trigger another change and expect no more calls
      realm.write(() => (alice.name = "Alice"));
      await new Promise((resolve) => setTimeout(resolve));
      expect(fooCalls).equals(1);
      expect(barCalls).equals(2);
    });

    it("adds only once", async function (this: RealmContext) {
      const { realm } = this;
      const alice = realm.write(() => realm.create("Person", { name: "Alice" }));
      let fooCalls = 0;
      function foo() {
        fooCalls++;
      }
      alice.addListener(foo);
      alice.addListener(foo);
      // Make a change to fire the listerner
      realm.write(() => (alice.name = "Alison"));
      // Begin a new write transaction to ensure the read transaction gets advanced
      realm.beginTransaction();
      realm.cancelTransaction();
      // Expect initial event + change
      expect(fooCalls).equals(2);
      // Make another change to fire the listerner
      realm.write(() => (alice.name = "Alison!"));
      // Begin a new write transaction to ensure the read transaction gets advanced
      realm.beginTransaction();
      realm.cancelTransaction();
      // Expect initial event + 2 * change
      expect(fooCalls).equals(3);
    });

    it("handles double removals", async function (this: RealmContext) {
      const { realm } = this;
      const alice = realm.write(() => realm.create("Person", { name: "Alice" }));
      function foo() {
        /* ... */
      }
      alice.addListener(foo);
      alice.removeListener(foo);
      alice.removeListener(foo);
    });

    it("handles removal before adding", async function (this: RealmContext) {
      const { realm } = this;
      const alice = realm.write(() => realm.create("Person", { name: "Alice" }));
      function foo() {
        /* ... */
      }
      alice.removeListener(foo);
      alice.addListener(foo);
      alice.removeListener(foo);
    });
  });

  // FIXME: Update all tests in this suite to use a collection, instead of an object
  describe("Register a listener on a collection of objects and get notified of changes", () => {
    beforeEach(function (this: RealmContext) {
      this.realm = new Realm({
        path: generateTempRealmPath(),
        inMemory: true,
        schema: [{ name: "Person", properties: { name: "string" } }],
      });
    });
    afterEach(closeRealm);

    it("fires initially", async function (this: RealmContext) {
      this.realm.write(() => this.realm.create("Person", { name: "Alice" }));
      const persons = this.realm.objects("Person");
      await new Promise<void>((resolve) => {
        persons.addListener((collection, changes) => {
          expect(collection).instanceOf(Results);
          expect(changes.deletions).deep.equals([]);
          expect(changes.insertions).deep.equals([]);
          expect(changes.newModifications).deep.equals([]);
          expect(changes.oldModifications).deep.equals([]);
          resolve();
        });
      });
    });

    it("fires on change", async function (this: RealmContext) {
      const alice = this.realm.write(() => this.realm.create("Person", { name: "Alice" }));
      const persons = this.realm.objects("Person");
      let calls = 0;
      await new Promise<void>((resolve) => {
        persons.addListener((collection, changes) => {
          if (calls === 0) {
            calls++;
            expect(collection).deep.equals(persons);
            // Update the name to trigger another event
            this.realm.write(() => (alice.name = "Alison"));
          } else if (calls === 1) {
            calls++;
            expect(collection).deep.equals(persons);
            expect(changes.deletions).deep.equals([]);
            expect(changes.insertions).deep.equals([]);
            expect(changes.newModifications).deep.equals([0]);
            expect(changes.oldModifications).deep.equals([0]);
            resolve();
          } else {
            throw new Error(`Unexpected number of calls (${calls})`);
          }
        });
      });
    });

    it("fires on deletion", async function (this: RealmContext) {
      const alice = this.realm.write(() => this.realm.create("Person", { name: "Alice" }));
      const persons = this.realm.objects("Person");
      let calls = 0;
      await new Promise<void>((resolve) => {
        persons.addListener((collection, changes) => {
          if (calls === 0) {
            calls++;
            expect(collection).deep.equals(persons);
            // Delete the object to trigger another event
            this.realm.write(() => this.realm.delete(alice));
          } else if (calls === 1) {
            calls++;
            expect(alice.isValid()).equals(false);
            expect(changes.deletions).deep.equals([0]);
            expect(changes.insertions).deep.equals([]);
            expect(changes.newModifications).deep.equals([]);
            expect(changes.oldModifications).deep.equals([]);
            resolve();
          } else {
            throw new Error(`Unexpected number of calls (${calls})`);
          }
        });
      });
    });

    it("doesn't fire if removed", async function (this: RealmContext) {
      const { realm } = this;
      const alice = realm.write(() => realm.create("Person", { name: "Alice" }));
      const persons = this.realm.objects("Person");
      let calls = 0;
      await new Promise<void>((resolve, reject) => {
        function callback(collection: typeof persons) {
          if (calls === 0) {
            // Initial fire
            calls++;
            expect(collection).deep.equals(persons);
            // Remove the listener
            persons.removeListener(callback);
            // Update the name to trigger another event
            realm.write(() => (alice.name = "Alison"));
            // Wait a bit to allow for an async update to trigger a rejection first
            setTimeout(resolve);
          } else {
            const err = new Error(`Unexpected number of calls (${calls})`);
            reject(err);
          }
        }
        persons.addListener(callback);
      });
    });

    it("doesn't fire if all are removed", async function (this: RealmContext) {
      const { realm } = this;
      const alice = realm.write(() => realm.create("Person", { name: "Alice" }));
      const persons = this.realm.objects("Person");
      let fooCalls = 0;
      let barCalls = 0;
      await Promise.all([
        new Promise<void>((resolve) => {
          function foo() {
            fooCalls++;
            // Remove the listener
            persons.removeListener(foo);
            // Update the name to trigger another event
            realm.write(() => (alice.name = "Alison"));
            resolve();
          }
          persons.addListener(foo);
        }),
        new Promise<void>((resolve) => {
          function bar() {
            barCalls++;
            if (barCalls === 2) {
              // Remove the listener
              persons.removeAllListeners();
              resolve();
            }
          }
          persons.addListener(bar);
        }),
      ]);
      expect(fooCalls).equals(1);
      expect(barCalls).equals(2);
      // Trigger another change and expect no more calls
      realm.write(() => (alice.name = "Alice"));
      await new Promise((resolve) => setTimeout(resolve));
      expect(fooCalls).equals(1);
      expect(barCalls).equals(2);
    });

    it("adds only once", async function (this: RealmContext) {
      const { realm } = this;
      const alice = realm.write(() => realm.create("Person", { name: "Alice" }));
      const persons = this.realm.objects("Person");
      let fooCalls = 0;
      function foo() {
        fooCalls++;
      }
      persons.addListener(foo);
      persons.addListener(foo);
      // Make a change to fire the listerner
      realm.write(() => (alice.name = "Alison"));
      // Begin a new write transaction to ensure the read transaction gets advanced
      realm.beginTransaction();
      realm.cancelTransaction();
      // Expect initial event + change
      expect(fooCalls).equals(2);
      // Make another change to fire the listerner
      realm.write(() => (alice.name = "Alison!"));
      // Begin a new write transaction to ensure the read transaction gets advanced
      realm.beginTransaction();
      realm.cancelTransaction();
      // Expect initial event + 2 * change
      expect(fooCalls).equals(3);
    });

    it("handles double removals", async function (this: RealmContext) {
      const { realm } = this;
      const persons = realm.objects("Person");
      function foo() {
        /* ... */
      }
      persons.addListener(foo);
      persons.removeListener(foo);
      persons.removeListener(foo);
    });

    it("handles removal before adding", async function (this: RealmContext) {
      const { realm } = this;
      const persons = realm.objects("Person");
      function foo() {
        /* ... */
      }
      persons.removeListener(foo);
      persons.addListener(foo);
      persons.removeListener(foo);
    });
  });
});
