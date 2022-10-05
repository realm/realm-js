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

import { Realm } from "../index";

import { closeRealm, generateTempRealmPath, RealmContext } from "./utils";

describe("Objects in lists", () => {
  describe("must work", () => {
    before(function (this: RealmContext) {
      this.realm = new Realm({
        path: generateTempRealmPath(),
        inMemory: true,
        schema: [
          { name: "Person", properties: { name: "string", age: "int", pets: "Pet[]" } },
          { name: "Pet", properties: { category: "string" } },
        ],
      });
    });
    after(closeRealm);
    it("with objects that have been created already", function (this: RealmContext) {
      this.realm.write(() => {
        const cat = this.realm.create("Pet", { category: "Cat" });
        this.realm.create("Person", {
          name: "Alice",
          age: 32,
          pets: [
            // This works
            cat,
            // This does not work
            {
              category: "Dog",
            },
          ],
        });
      });
    });
  });
});
