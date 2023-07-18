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
import Realm from "realm";

import { openRealmBefore } from "../hooks";

type Item<T = unknown> = { set: Realm.Set<T> };
type Person = { name: string };

describe("Set", () => {
  describe("with unconstrained (mixed) values", () => {
    openRealmBefore({
      schema: [
        {
          name: "Item",
          properties: { set: { type: "set", objectType: "mixed" } },
        },
        {
          name: "Person",
          properties: { name: "string" },
        },
      ],
    });

    it("returns a Set", function (this: RealmContext) {
      const { set } = this.realm.write(() => this.realm.create<Item>("Item", {}));
      expect(set).instanceOf(Realm.Set);
      expect(set.length).equals(0);
      expect(set.has("bar")).equals(false);
      expect([...set]).deep.equals([]);
    });

    describe("string values", () => {
      it("initializes values", function (this: RealmContext) {
        const { set } = this.realm.write(() => this.realm.create<Item>("Item", { set: ["hello"] }));
        expect([...set]).deep.equals(["hello"]);
      });

      it("adds", function (this: RealmContext) {
        const item = this.realm.write(() => this.realm.create<Item>("Item", {}));
        const set = this.realm.write(() => item.set.add("hello"));
        expect([...set]).deep.equals(["hello"]);
      });

      it("deletes", function (this: RealmContext) {
        const { set } = this.realm.write(() => this.realm.create<Item>("Item", { set: ["hello"] }));
        const success1 = this.realm.write(() => set.delete("hello"));
        expect(success1).equals(true);
        expect([...set]).deep.equals([]);
        // Deleting it twice
        const success2 = this.realm.write(() => set.delete("hello"));
        expect(success2).equals(false);
      });
      it("is iterable", function (this: RealmContext) {
        const { set } = this.realm.write(() =>
          this.realm.create<Item>("Item", { set: ["hello", "world", "foo", "bar"] }),
        );

        // Create a copy of the values to compare against since the order is not guaranteed
        const copiedValues = [...set];

        const valuesIter = set.values();
        expect(valuesIter.next()).deep.equals({ value: copiedValues[0], done: false });
        expect(valuesIter.next()).deep.equals({ value: copiedValues[1], done: false });
        expect(valuesIter.next()).deep.equals({ value: copiedValues[2], done: false });
        expect(valuesIter.next()).deep.equals({ value: copiedValues[3], done: false });
        expect(valuesIter.next()).deep.equals({ value: undefined, done: true });

        const entriesIter = set.entries();
        expect(entriesIter.next()).deep.equals({ value: [copiedValues[0], copiedValues[0]], done: false });
        expect(entriesIter.next()).deep.equals({ value: [copiedValues[1], copiedValues[1]], done: false });
        expect(entriesIter.next()).deep.equals({ value: [copiedValues[2], copiedValues[2]], done: false });
        expect(entriesIter.next()).deep.equals({ value: [copiedValues[3], copiedValues[3]], done: false });
        expect(entriesIter.next()).deep.equals({ value: undefined, done: true });

        // This fails
        const keysIter = set.keys();
        expect(keysIter.next()).deep.equals({ value: copiedValues[0], done: false });
        expect(keysIter.next()).deep.equals({ value: copiedValues[1], done: false });
        expect(keysIter.next()).deep.equals({ value: copiedValues[2], done: false });
        expect(keysIter.next()).deep.equals({ value: copiedValues[3], done: false });
        expect(keysIter.next()).deep.equals({ value: undefined, done: true });

        const forEachValues: string[] = [];
        set.forEach((value) => forEachValues.push(value as string));
        expect(forEachValues).deep.equals(copiedValues);

        // This fails
        const forEachEntries: [string, string][] = [];
        // @ts-expect-error - The type of the callback is wrong
        set.forEach((value, key) => forEachEntries.push([key as string, value as string]));

        expect(forEachEntries).deep.equals([
          [copiedValues[0], copiedValues[0]],
          [copiedValues[1], copiedValues[1]],
          [copiedValues[2], copiedValues[2]],
          [copiedValues[3], copiedValues[3]],
        ]);

        // This fails
        const forEachKeys: string[] = [];
        // @ts-expect-error - The type of the callback is wrong
        set.forEach((value, key) => forEachKeys.push(key as string));
        expect(forEachKeys).deep.equals(copiedValues);

        const forInValues: string[] = [];
        for (const value of set) {
          forInValues.push(value as string);
        }
        expect(forInValues).deep.equals(copiedValues);
      });
    });

    describe("object values", () => {
      type PersonItem = Item<Person & Realm.Object<Person>>;

      it("initializes values", function (this: RealmContext) {
        const alice = this.realm.write(() => this.realm.create<Person>("Person", { name: "Alice" }));
        const { set } = this.realm.write(() => this.realm.create<PersonItem>("Item", { set: [alice] }));
        const [value] = [...set];
        expect(value._objectKey()).equals(alice._objectKey());
      });

      it("adds", function (this: RealmContext) {
        const alice = this.realm.write(() => this.realm.create<Person>("Person", { name: "Alice" }));
        const item = this.realm.write(() => this.realm.create<PersonItem>("Item", {}));
        const set = this.realm.write(() => item.set.add(alice));
        const [value] = [...set];
        expect(value._objectKey()).equals(alice._objectKey());
      });

      it("deletes", function (this: RealmContext) {
        const alice = this.realm.write(() => this.realm.create<Person>("Person", { name: "Alice" }));
        const { set } = this.realm.write(() => this.realm.create<PersonItem>("Item", { set: [alice] }));
        const success = this.realm.write(() => set.delete(alice));
        expect(success).equals(true);
        expect([...set]).deep.equals([]);
      });
    });
  });
});
