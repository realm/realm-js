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
import { Realm } from "realm";

interface Test {
  primary: number;
  value: number;
  simpleValue: number;
}

describe("Realm schema", () => {
  describe("Default property values", () => {
    let idIncPrim = 0;
    let idIncNorm = 0;
    before(() => {
      Realm.clearTestState();
    });
    openRealmBefore({
      schema: [
        {
          name: "Test",
          primaryKey: "primary",
          properties: {
            primary: {
              type: "int",
              default: () => ++idIncPrim,
            },
            value: {
              type: "int",
              default: () => ++idIncNorm,
            },
            simpleValue: {
              type: "int",
              default: () => 42,
            },
          },
        },
      ],
    });
    it("can take a function as a default property value", function (this: RealmContext) {
      const { realm } = this;
      let obj = realm.write(() => {
        return realm.create<Test>("Test", {});
      });

      expect(obj.primary).to.equal(1);
      expect(obj.value).to.equal(1);
      expect(obj.simpleValue).to.equal(42);

      obj = realm.write(() => {
        return realm.create<Test>("Test", {});
      });

      expect(obj.primary).to.equal(2);
      expect(obj.value).to.equal(2);
      expect(obj.simpleValue).to.equal(42);
    });
    it("can override the default property value", function (this: RealmContext) {
      const { realm } = this;
      const obj = realm.write(() => {
        return realm.create<Test>("Test", { primary: 42, value: 13, simpleValue: 123 });
      });
      expect(obj.primary).to.equal(42);
      expect(obj.value).to.equal(13);
      expect(obj.simpleValue).to.equal(123);
    });
  });

  describe("Schema validation", () => {
    it("throws on invalid indexed type", () => {
      expect(() => {
        new Realm({
          schema: [
            {
              name: "testProp",
              properties: {
                content: { type: "string", indexed: 22 },
              },
            },
          ],
        });
      }).throws(
        "Invalid type declaration for property 'content' on 'testProp': Expected 'content.indexed' on 'testProp' to be a boolean or 'full-text'",
      );
    });
  });

  it("throws when declaring full-text index on non string property", () => {
    expect(() => {
      new Realm({
        schema: [
          {
            name: "testProp",
            properties: {
              num: { type: "int", indexed: "full-text" },
            },
          },
        ],
      });
    }).throws("Index not supported for this property: num");
  });

  it("throws when declaring full-text index on primary key", () => {
    expect(() => {
      new Realm({
        schema: [
          {
            name: "testProp",
            properties: {
              myString: { type: "string", indexed: "full-text" },
            },
            primaryKey: "myString",
          },
        ],
      });
    }).throws(
      "Invalid type declaration for property 'myString' on 'testProp': 'myString on 'testProp' cannot be both a primary key and have a full-text index",
    );
  });
});
