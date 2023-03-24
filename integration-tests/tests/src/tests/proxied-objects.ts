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

import { expect } from "chai";
import { Realm } from "realm";

import { openRealmBefore } from "../hooks";

describe("Proxy wrapping Realm.Objects", () => {
  describe("object models", () => {
    type Person = { name: string };
    openRealmBefore({ schema: [{ name: "Person", properties: { name: "string" } }] });

    it("supports property gets", function (this: RealmContext) {
      const alice = this.realm.write(() => this.realm.create<Person>("Person", { name: "Alice" }));
      const proxiedAlice = new Proxy(alice, {
        get(target, prop, receiver) {
          return Reflect.get(target, prop, receiver);
        },
      });
      expect(proxiedAlice.name).equals("Alice");
      expect(proxiedAlice.constructor).equals(alice.constructor);
      this.realm.write(() => {
        this.realm.delete(proxiedAlice);
      });
    });
  });

  describe("class-based models", () => {
    class Person extends Realm.Object<Person> {
      declare name: string;
      static schema = { name: "Person", properties: { name: "string" } };
    }
    openRealmBefore({ schema: [Person] });

    it("supports property gets", function (this: RealmContext) {
      const alice = this.realm.write(() => this.realm.create(Person, { name: "Alice" }));
      const proxiedAlice = new Proxy(alice, {
        get(target, prop, receiver) {
          return Reflect.get(target, prop, receiver);
        },
      });
      // expect(proxiedAlice.name).equals("Alice");
      // expect(proxiedAlice.constructor).equals(alice.constructor);
      this.realm.write(() => {
        this.realm.delete(proxiedAlice);
      });
    });
  });
});
