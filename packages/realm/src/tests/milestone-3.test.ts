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

import { Realm } from "../index";
import { closeRealm, generateTempRealmPath, RealmContext } from "./utils";

describe("Milestone #3", () => {
  describe("Register a listener on an object and get notified of changes", () => {
    beforeEach(function (this: RealmContext) {
      this.realm = new Realm({
        path: generateTempRealmPath(),
        schema: [{ name: "Person", properties: { name: "string", bestFriend: "Person", friends: "Person[]" } }],
      });
    });
    afterEach(closeRealm);

    it("fires initially", async function (this: RealmContext) {
      const alice = this.realm.write(() => this.realm.create("Person", { name: "Alice" }));
      await new Promise<void>((resolve) => {
        alice.addListener((object, changes) => {
          expect(object).equals(alice);
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
            expect(object).equals(alice);
            expect(changes.deleted).equals(false);
            expect(changes.changedProperties.length).equals(0);
            // Update the name to trigger another event
            this.realm.write(() => (alice.name = "Alison"));
          } else if (calls === 1) {
            calls++;
            expect(object).equals(alice);
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
            expect(object).equals(alice);
            expect(changes.deleted).equals(false);
            expect(changes.changedProperties.length).equals(0);
            // Delete the object to trigger another event
            this.realm.write(() => this.realm.delete(alice));
          } else if (calls === 1) {
            calls++;
            expect(object).equals(alice);
            expect(changes.deleted).equals(true);
            expect(changes.changedProperties.length).equals(0);
            resolve();
          } else {
            throw new Error(`Unexpected number of calls (${calls})`);
          }
        });
      });
    });
  });
});
