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

describe("Serializing", () => {
  describe("an Object", () => {
    after(closeRealm);
    it("returns a plain object", function (this: RealmContext) {
      this.realm = new Realm({
        path: generateTempRealmPath(),
        inMemory: true,
        schema: [{ name: "Person", properties: { name: "string", age: "int", bestFriend: "Person" } }],
      });
      const alice = this.realm.write(() => this.realm.create("Person", { name: "Alice", age: 32 }));
      const serialized = alice.toJSON();
      console.log({ serialized });
    });
  });
});
