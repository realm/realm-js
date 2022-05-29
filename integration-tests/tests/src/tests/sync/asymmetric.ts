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
import Realm, { BSON, ClientResetMode, SessionStopPolicy } from "realm";

import { authenticateUserBefore, importAppBefore, openRealmBeforeEach } from "../../hooks";

describe.skipIf(environment.missingServer, "Asymmetric sync", function () {
  describe("Configuration and schema", function () {
    [true, false].forEach((asymmetric) => {
      [true, false].forEach((embedded) => {
        let PersonSchema: Realm.ObjectSchema = {
          name: "Person",
          asymmetric: asymmetric,
          embedded: embedded,
          properties: {
            _id: "objectId",
            age: "int",
            name: "string",
          },
        };

        it(`Schema with asymmetric = ${asymmetric} and embedded = ${embedded}`, () => {
          Realm.deleteFile({});
          if (!embedded) {
            PersonSchema.primaryKey = "_id";
          }
          if (embedded && asymmetric) {
            expect(() => {
              new Realm({ schema: [PersonSchema] });
            }).to.throw();
          } else {
            const realm = new Realm({ schema: [PersonSchema] });
            const schema = realm.schema;
            expect(schema.length).to.equal(1);
            expect(schema[0].asymmetric).to.equal(asymmetric);
            expect(schema[0].embedded).to.equal(embedded);
            realm.close();
          }
        });
      });
    });
  });

  describe("Creating objects", function () {
    const PersonSchema: Realm.ObjectSchema = {
      name: "Person",
      primaryKey: "_id",
      asymmetric: true,
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

    it("creating an object for an asymmetric schema returns undefined", function () {
      // ..
    });
    
    it("an asymmetric schema cannot be queried", function () {
      // ..
    });
      this.realm.write(() => {
        const retval = this.realm.create(PersonSchema.name, { _id: new BSON.ObjectId(), name: "Joe", age: 12 });
        expect(retval).to.equal(undefined);
      });
      expect(() => {
        this.realm.objects(PersonSchema.name);
      }).to.throw("You cannot query an asymmetric class.");
    });
  });
});
