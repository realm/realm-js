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

import { authenticateUserBefore, importAppBefore, openRealmBefore } from "../../hooks";
import { buildAppConfig } from "../../utils/build-app-config";

describe("Asymmetric sync", function () {
  [true, false].forEach((embeddedAndAsymmetric) => {
    describe(`Configuration and schema (embedded = ${embeddedAndAsymmetric})`, function () {
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
          dogs: "Dog[]",
        },
      };

      const DogSchema: Realm.ObjectSchema = {
        name: "Dog",
        asymmetric: embeddedAndAsymmetric,
        embedded: embeddedAndAsymmetric,
        primaryKey: embeddedAndAsymmetric ? undefined : "_id",
        properties: {
          _id: "objectId",
          name: "string",
        },
      };

      importAppBefore(buildAppConfig("with-flx").anonAuth().flexibleSync());
      authenticateUserBefore();
      openRealmBefore({
        schema: [PersonSchema, DogSchema],
        sync: {
          flexible: true,
        },
      });

      it("Schema with asymmetric = true and embedded = false", function (this: RealmContext) {
        const schema = this.realm.schema.find((s) => s.name === PersonSchema.name);
        expect(schema?.asymmetric).to.be.true;
        expect(schema?.embedded).to.be.false;
      });

      it("creating an object for an asymmetric schema returns undefined", function (this: RealmContext) {
        this.realm.write(() => {
          const returnValue = this.realm.create(PersonSchema.name, {
            _id: new BSON.ObjectId(),
            name: "Joe",
            age: 12,
          });
          expect(returnValue).to.be.undefined;
        });
      });

      it("an asymmetric schema cannot be queried through 'objects()'", function (this: RealmContext) {
        expect(() => {
          this.realm.objects(PersonSchema.name);
        }).to.throw("You cannot query an asymmetric object.");
      });

      it("an asymmetric schema cannot be queried through 'objectForPrimaryKey()'", function (this: RealmContext) {
        expect(() => {
          this.realm.objectForPrimaryKey(PersonSchema.name, new BSON.ObjectId());
        }).to.throw("You cannot query an asymmetric object.");
      });

      it("an asymmetric schema cannot be queried through '_objectForObjectKey()'", function (this: RealmContext) {
        expect(() => {
          // A valid objectKey is not needed for this test
          //@ts-expect-error Internal method
          this.realm._objectForObjectKey(PersonSchema.name, "12345");
        }).to.throw("You cannot query an asymmetric object.");
      });

      it("relationships", async function (this: RealmContext) {
        if (!embeddedAndAsymmetric) {
          await this.realm.objects(DogSchema.name).subscribe();
        }
        expect(() => {
          this.realm.write(() => {
            this.realm.create(PersonSchema.name, {
              _id: new BSON.ObjectId(),
              name: "Joe",
              age: 12,
              dogs: [
                { _id: new BSON.ObjectId(), name: "Rex" },
                { _id: new BSON.ObjectId(), name: "Fido" },
              ],
            });
          });
        }).not.throw();
      });
    });
  });
});
