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

import { ObjectSchema, Realm } from "../index";
import { expect } from "chai";

import { closeRealm, generateTempRealmPath, RealmContext } from "./utils";

const oldSchema: ObjectSchema[] = [{ name: "Person", properties: { name: "string", age: "int" } }];
const newSchema: ObjectSchema[] = [{ name: "Person2", properties: { title: "string", friends: "int" } }];

describe("realm._updateSchema", () => {
  beforeEach(function (this: RealmContext) {
    this.realm = new Realm({
      path: generateTempRealmPath(),
      inMemory: true,
      schema: oldSchema,
    });
  });
  afterEach(closeRealm);

  it("can add new schema classes", function (this: RealmContext) {
    this.realm.write(() => {
      this.realm._updateSchema(newSchema);
      this.realm.create("Person2", { title: "Good", friends: 3 });
    });
  });
  it("can only be called in a transaction", function (this: RealmContext) {
    expect(() => this.realm._updateSchema(newSchema)).throw("Can only create object schema within a transaction.");
  });
});
