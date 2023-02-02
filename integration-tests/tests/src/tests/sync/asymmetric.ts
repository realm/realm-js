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
import Realm, { BSON } from "realm";

import { authenticateUserBefore, importAppBefore, openRealmBeforeEach } from "../../hooks";

describe.skipIf(environment.missingServer, "Asymmetric sync", function () {
  describe("Configuration and schema", function () {
    this.longTimeout();
    const PersonSchema: Realm.ObjectSchema = {
      name: "Person",
      asymmetric: true,
      embedded: false,
      primaryKey: "_id",
      properties: {
        _id: "objectId",
        age: "int",
        name: "string",
      },
    };

    importAppBefore("with-db-flx");
    authenticateUserBefore();
    openRealmBeforeEach({
      schema: [PersonSchema],
      sync: {
        flexible: true,
      },
    });

    it("Schema with asymmetric = true and embedded = false", function () {
      const schema = this.realm.schema;
      expect(schema.length).to.equal(1);
      expect(schema[0].asymmetric).to.equal(true);
      expect(schema[0].embedded).to.equal(false);
    });

    it("creating an object for an asymmetric schema returns undefined", function () {
      this.realm.write(() => {
        const returnValue = this.realm.create(PersonSchema.name, { _id: new BSON.ObjectId(), name: "Joe", age: 12 });
        expect(returnValue).to.equal(undefined);
      });
    });

    it("an asymmetric schema cannot be queried", function () {
      expect(() => {
        this.realm.objects(PersonSchema.name);
      }).to.throw("You cannot query an asymmetric class.");
    });
  });
});
