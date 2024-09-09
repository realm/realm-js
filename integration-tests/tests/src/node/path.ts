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

import { expect } from "chai";
import Realm, { BSON } from "realm";
import path from "node:path";
import os from "node:os";

const getAbsolutePath = () => os.tmpdir() + path.sep + new BSON.UUID().toHexString();
const getRelativePath = () => "testFiles" + path.sep + new BSON.UUID().toHexString();

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
    const realm = new Realm({ path: filename, schema: [schema] });
    const realmPath = realm.path;
    expect(realmPath.endsWith(filename)).to.be.true;
    realm.close();
    Realm.deleteFile({ path: realmPath });
  });

  it("absolute path", function () {
    const filename = getAbsolutePath();
    const realm = new Realm({ path: filename, schema: [schema] });
    const realmPath = realm.path;
    expect(realmPath).to.equal(filename);
    realm.close();
    Realm.deleteFile({ path: realmPath });
  });
});
