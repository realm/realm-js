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
import Realm from "realm";

import { PersonSchema } from "../schemas/person-and-dogs";

describe("Realm transactions", () => {
  beforeEach(() => {
    Realm.clearTestState();
  });

  describe("Manual transactions", () => {
    it("throw exception in transaction", () => {
      // https://github.com/realm/realm-js/issues/4747
      const message = "Something is wrong";
      const realm = new Realm({ schema: [PersonSchema] });
      realm.beginTransaction();
      try {
        realm.create(PersonSchema.name, {
          name: "John Doe",
          age: 42,
        });
        throw new Error(message);
      } catch (err) {
        expect((err as Error).message).equals(message);
        expect(realm.isInTransaction).to.be.true;
        realm.cancelTransaction();
      } finally {
        expect(realm.objects(PersonSchema.name).length).equals(0);
        realm.close();
      }
      expect(realm.isClosed).to.be.true;
    });
  });
});
