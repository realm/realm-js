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
import { openRealmBefore } from "../hooks";

interface Test {
  primary?: number;
  value?: number;
}

describe("Realm schema", () => {
  describe("Default property values", () => {
    openRealmBefore({
      schema: [
        {
          name: "Test",
          primaryKey: "primary",
          properties: {
            primary: {
              type: "int",
              default: () => 42,
            },
            value: {
              type: "int",
              default: () => 13,
            },
          },
        },
      ],
    });
    it("can take a function as a default property value", function (this: RealmContext) {
      const { realm } = this;
      const test = realm.write(() => {
        return realm.create<Test>("Test", {});
      });

      expect(test.primary).to.equal(42);
      expect(test.value).to.equal(13);

      const staticTest = realm.write(() => {
        return realm.create<Test>("Test", { primary: 0, value: 0 });
      });
      expect(staticTest.primary).to.equal(0);
      expect(staticTest.value).to.equal(0);
    });
  });
});
