////////////////////////////////////////////////////////////////////////////
//
// Copyright 2023 Realm Inc.
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

import { UUID } from "bson";
import { expect } from "chai";
import Realm from "realm";
import path from "node:path";
import os from "node:os";

import { importAppBefore, authenticateUserBefore } from "../hooks";

const getAbsolutePath = () => os.tmpdir() + path.sep + (new UUID()).toHexString();
const getRelativePath = () => new UUID().toHexString();
const getPartitionValue = () => new UUID().toHexString();

const schema = {
  name: "MixedClass",
  primaryKey: "_id",
  properties: {
    _id: "objectId",
    value: "mixed?",
  },
};

describe("path configuration (local)", function () {
  it("relative path", function () {
    const filename = getRelativePath();
    const realm = new Realm({ path: filename, schema: [ schema ] });
    expect(realm.path.endsWith(filename)).to.be.true;
    realm.close();
  });

  it("absolute path", function () {
    const filename = getAbsolutePath();
    const realm = new Realm({ path: filename, schema: [schema] });
    expect(realm.path).to.equal(filename);
    realm.close();
  });
});

describe.skipIf(environment.missingServer, "path configuration (partition based sync)", function () {
  importAppBefore("with-db");
  authenticateUserBefore();

  it("absolute path", async function () {
    const filename = getAbsolutePath();
    const realm = await Realm.open({
      path: filename,
      schema: [schema],
      sync: {
        partitionValue: getPartitionValue(),
        user: this.user,
      }
    });
    expect(realm.path).to.equal(filename);
    realm.close();
  });

  it("relative path", async function () {
    const filename = getRelativePath();
    const realm = await Realm.open({
      path: filename,
      schema: [schema],
      sync: {
        partitionValue: getPartitionValue(),
        user: this.user,
      }
    });
    expect(realm.path.endsWith(filename)).to.be.true;
    realm.close();
  });
});

describe.skipIf(environment.skipFlexibleSync, "path configuration (flexible sync)", function () {
  importAppBefore("with-db-flx");
  authenticateUserBefore();

  it("absolute path", async function () {
    const filename = getAbsolutePath();
    const realm = await Realm.open({
      path: filename,
      schema: [ schema ],
      sync: {
        flexible: true,
        user: this.user,
      }
    });
    expect(realm.path).to.equal(filename);
    realm.close();
  });

  it("relative path", async function () {
    const filename = getRelativePath();
    const realm = await Realm.open({
      path: filename,
      schema: [schema],
      sync: {
        flexible: true,
        user: this.user,
      }
    });
    expect(realm.path.endsWith(filename)).to.be.true;
    realm.close();
  });
});
