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
import { CanonicalObjectSchema } from "../Object";

type RealmContext = Mocha.Context & { realm: Realm };

describe("Opening default local Realm", () => {
  it("can read schema from disk", () => {
    const realm = new Realm();
    const schema = realm.schema;
    const expectedSchema: CanonicalObjectSchema[] = [
      {
        name: "Person",
        properties: { name: { name: "name", type: "string", optional: false, indexed: false, mapTo: "name" } },
      },
    ];
    expect(schema).deep.equals(expectedSchema);
  });
});

describe("Reading an object by primary key", () => {
  before(function (this: RealmContext) {
    this.realm = new Realm();
  });

  it("returns an instance of Realm.Object", function (this: RealmContext) {
    const alice = this.realm.objectForPrimaryKey("Person", "alice");
    expect(alice).instanceOf(Realm);
  });
});
