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
import { BSON, Realm } from "realm";

describe("Realm schema", () => {
  describe("Default property values", () => {
    it("can take a function as a default property value", () => {
      interface Test {
        dynamic?: number;
      }

      const realm = new Realm({
        schema: [
          {
            name: "Test",
            properties: {
              dynamic: {
                type: "int",
                default: () => 42,
              },
            },
          },
        ],
      });

      const test = realm.write(() => {
        return realm.create<Test>("Test", {});
      });

      expect(test.dynamic).to.equal(42);
    });
    it("can take a function as a default property value for a primary key", () => {
      interface Test {
        dynamic?: number;
      }

      const realm = new Realm({
        schema: [
          {
            name: "Test",
            primaryKey: "dynamic",
            properties: {
              dynamic: {
                type: "int",
                default: () => 42,
              },
            },
          },
        ],
      });

      const test = realm.write(() => {
        return realm.create<Test>("Test", {});
      });

      expect(test.dynamic).to.equal(42);
    });
  });
});
