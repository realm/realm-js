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
import Realm, { List } from "realm";

import { openRealmBefore, openRealmBeforeEach } from "../hooks";
import { createLocalConfig } from "../utils/open-realm";

describe("SharedRealm operations", () => {
  describe("logger", () => {
    it("logger callback gets called", async function () {
      type Log = {
        message: string;
        level: string;
      };
      let logs: Log[] = [];

      Realm.setLogger((level, message) => {
        logs.push({ level, message });
      });

      Realm.setLogLevel("all");

      const realm = await Realm.open({
        schema: [{ name: "Person", properties: { name: "string" } }],
      });
      realm.write(() => realm.create("Person", { name: "Alice" }));

      expect(logs).to.not.be.empty;
      expect(logs.map((l) => l.level)).to.contain.members(["trace", "debug"]);
      logs = [];

      Realm.setLogLevel("trace");
      realm.write(() => realm.create("Person", { name: "Alice" }));
      expect(logs.map((l) => l.level)).to.contain.members(["trace", "debug"]);
      logs = [];

      Realm.setLogLevel("debug");
      realm.write(() => realm.create("Person", { name: "Alice" }));
      expect(logs.map((l) => l.level))
        .to.contain("debug")
        .and.to.not.contain("trace");
      logs = [];

      Realm.setLogLevel("info");
      realm.write(() => realm.create("Person", { name: "Alice" }));
      expect(logs).to.be.empty;

      Realm.setLogLevel("warn");
      realm.write(() => realm.create("Person", { name: "Alice" }));
      expect(logs).to.be.empty;

      Realm.setLogLevel("error");
      realm.write(() => realm.create("Person", { name: "Alice" }));
      expect(logs).to.be.empty;

      Realm.setLogLevel("fatal");
      realm.write(() => realm.create("Person", { name: "Alice" }));
      expect(logs).to.be.empty;

      //This will also disable the logger again after the test
      Realm.setLogLevel("off");
      realm.write(() => realm.create("Person", { name: "Alice" }));
      expect(logs).to.be.empty;
    });
  });

  describe("object deletion", () => {
    openRealmBefore({ schema: [{ name: "Person", properties: { name: "string" } }] });

    it("succeeds from the same SharedRealm via a different Realm instance", function (this: RealmContext) {
      const alice = this.realm.write(() => this.realm.create("Person", { name: "Alice" }));
      const realm2 = new Realm({ path: this.realm.path });
      realm2.write(() => {
        realm2.delete(alice);
      });
    });

    it("throws when object is from another Realm", function (this: RealmContext) {
      const alice = this.realm.write(() => this.realm.create("Person", { name: "Alice" }));
      const realm2 = new Realm(createLocalConfig({ schema: [{ name: "Person", properties: { name: "string" } }] }));
      expect(() => {
        realm2.write(() => {
          realm2.delete(alice);
        });
      }).throws("Can't delete an object from another Realm");
    });
  });

  describe("List#unshift", () => {
    type Person = { name: string; friends: Realm.List<Person> };
    openRealmBeforeEach({
      schema: [{ name: "Person", primaryKey: "name", properties: { name: "string", friends: "Person[]" } }],
    });

    it("succeeds from the same SharedRealm via a different Realm instance", function (this: RealmContext) {
      const realm2 = new Realm({ path: this.realm.path });

      const alice = this.realm.write(() => this.realm.create<Person>("Person", { name: "Alice" }));
      const bob = realm2.write(() => realm2.create<Person>("Person", { name: "Bob" }));

      this.realm.write(() => {
        alice.friends.unshift(bob);
      });
    });

    it("succeeds when object is from another Realm", function (this: RealmContext) {
      const realm2 = new Realm(
        createLocalConfig({
          schema: [{ name: "Person", primaryKey: "name", properties: { name: "string" } }],
        }),
      );

      const alice = this.realm.write(() => this.realm.create<Person>("Person", { name: "Alice" }));
      const bob = realm2.write(() => realm2.create<Person>("Person", { name: "Bob" }));

      this.realm.write(() => {
        alice.friends.unshift(bob);
      });

      expect(this.realm.objectForPrimaryKey("Person", "Bob")).primaryKey.equals("Bob");
    });
  });
});
