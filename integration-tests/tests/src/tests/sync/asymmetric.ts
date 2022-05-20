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
        const PersonSchema: Realm.ObjectSchema = {
          name: "Person",
          primaryKey: "_id",
          asymmetric: asymmetric,
          embedded: embedded,
          properties: {
            _id: "objectId",
            age: "int",
            name: "string",
          },
        };

        it.only(`Schema with asymmetric = ${asymmetric} and embedded = ${embedded}`, () => {
          if (embedded && asymmetric) {
            expect(() => {
              new Realm({ schema: [PersonSchema ]});
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
});
