////////////////////////////////////////////////////////////////////////////
//
// Copyright 2020 Realm Inc.
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
import { PersonSchema, IPerson } from "../schemas/person-and-dogs";

describe("Immutable Realm", () => {
  beforeEach(() => {
    Realm.clearTestState();
  });

  describe("objects", () => {
    it("to be freezable", () => {
      const realm = new Realm({ schema: [PersonSchema] });
      let john: IPerson & Realm.Object;

      realm.write(() => {
        john = realm.create<IPerson & Realm.Object>(PersonSchema.name, {
          name: "John Doe",
          age: 42,
        });
      });

      expect(john._isFrozen).equals(false);
      const frozenJohn = john._freeze<IPerson>();
      expect(john._isFrozen).equals(false);
      expect(frozenJohn._isFrozen).equals(true);
      expect(john._version).equals(3);
      expect(frozenJohn._version).equals(3);

      realm.write(() => {
        john.age = 43;
      });

      expect(john.age).equals(43);
      expect(frozenJohn.age).equals(42);
      expect(frozenJohn._isFrozen).equals(true);
      expect(john._version).equals(4);
      expect(frozenJohn._version).equals(3);
    });
  });
});
