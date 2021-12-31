////////////////////////////////////////////////////////////////////////////
//
// Copyright 2021 Realm Inc.
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
import { authenticateUserBefore, importAppBefore, openRealm, openRealmBeforeEach } from "../hooks";

const config = {
  schema: [
    {
      name: "MixedClass",
      primaryKey: "_id",
      properties: {
        _id: "objectId",
        value: "mixed?",
        list: "mixed[]",
      },
    },
  ],
  sync: { partitionValue: "mixed-test" },
};

describe("context issue", function () {
  importAppBefore("with-db");
  authenticateUserBefore();
  openRealmBeforeEach(config);

  it("is ok", function () {
    // expect(this.realm.syncSession).to.not.be.null;
  });

  describe("inner suite", function () {
    // openRealmBeforeEach(config);

    it("test 1 is ok", async function () {
      console.log("before open", this.realm.id, this.realm.syncSession);
      expect(this.realm.syncSession).to.not.be.null;

      this.realm.close();
      delete this.realm;
      this.realm = undefined;

      await openRealm(this as any, config); // *** 1
      console.log("after open", this.realm.id, this.realm.syncSession);

      expect(this.realm.syncSession).to.not.be.null;
    });

    it("test 2 is not ok", async function () {
      // If the openRealmBeforeEach is at the top level, then this.realm is the realm created
      // at "*** 1" above (which has gone out of scope).
      // If the openRealmBeforeEach is in this describe block, then this.realm is the realm created
      // in openRealmHook, as expected.

      console.log("start of test 2", this.realm.id, this.realm.syncSession);

      this.realm.write(() => this.realm.create("MixedClass", { _id: new Realm.BSON.ObjectId(), value: "123" }));
      expect(this.realm.syncSession).to.not.be.null;
    });
  });
});
