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
import { existsSync, rmSync } from "node:fs";

import { importAppBefore, authenticateUserBefore } from "../hooks";
import { importApp } from "../utils/import-app";

const getAbsolutePath = () => os.tmpdir() + path.sep + new BSON.UUID().toHexString();
const getRelativePath = () => "testFiles" + path.sep + new BSON.UUID().toHexString();
const getPartitionValue = () => new BSON.UUID().toHexString();

const Schema = {
  name: "MixedClass",
  primaryKey: "_id",
  properties: {
    _id: "objectId",
    value: "mixed?",
  },
};

const FlexibleSchema = { ...Schema, properties: { ...Schema.properties, nonQueryable: "string?" } };

describe("path configuration (local)", function () {
  it("relative path", function () {
    const filename = getRelativePath();
    const realm = new Realm({ path: filename, schema: [Schema] });
    expect(realm.path.endsWith(filename)).to.be.true;
    realm.close();
    Realm.deleteFile({ path: filename });
  });

  it("absolute path", function () {
    const filename = getAbsolutePath();
    const realm = new Realm({ path: filename, schema: [Schema] });
    expect(realm.path).to.equal(filename);
    realm.close();
    Realm.deleteFile({ path: filename });
  });
});

describe.skipIf(environment.missingServer, `app configuration of root directory (flexible sync)`, async function () {
  const { appId, baseUrl } = await importApp("with-db-flx");

  it.only("directory and file created where expected", async function () {
    const tmpdir = getAbsolutePath();
    expect(fs.exists(tmpdir)).to.be.false;

    const app = new Realm.App({ id: appId, baseUrl, syncRootDirectory: tmpdir });
    const user = await app.logIn(Realm.Credentials.anonymous());

    const realm = await Realm.open({
      schema: [FlexibleSchema],
      sync: {
        flexible: true,
        user,
      },
    });

    expect(existsSync(tmpdir)).to.be.true;
    expect(realm.path.startsWith(tmpdir));

    realm.close();
    rmSync(tmpdir, { recursive: true });
  });
});

describe.skipIf(environment.missingServer, "path configuration (partition based sync)", function () {
  importAppBefore("with-db");
  authenticateUserBefore();

  it("absolute path", async function () {
    const filename = getAbsolutePath();
    const realm = await Realm.open({
      path: filename,
      schema: [Schema],
      sync: {
        partitionValue: getPartitionValue(),
        user: this.user,
      },
    });
    expect(realm.path).to.equal(filename);
    realm.close();
    Realm.deleteFile({ path: filename });
  });

  it("relative path", async function () {
    const filename = getRelativePath();
    const realm = await Realm.open({
      path: filename,
      schema: [Schema],
      sync: {
        partitionValue: getPartitionValue(),
        user: this.user,
      },
    });
    expect(realm.path.endsWith(filename)).to.be.true;
    realm.close();
    Realm.deleteFile({ path: filename });
  });
});

describe.skipIf(environment.skipFlexibleSync, "path configuration (flexible sync)", function () {
  importAppBefore("with-db-flx");
  authenticateUserBefore();

  it("absolute path", async function () {
    this.longTimeout();
    const filename = getAbsolutePath();
    const realm = await Realm.open({
      path: filename,
      schema: [FlexibleSchema],
      sync: {
        flexible: true,
        user: this.user,
      },
    });
    expect(realm.path).to.equal(filename);
    realm.close();
    Realm.deleteFile({ path: filename });
  });

  it("relative path", async function () {
    this.longTimeout();
    const filename = getRelativePath();
    const realm = await Realm.open({
      path: filename,
      schema: [FlexibleSchema],
      sync: {
        flexible: true,
        user: this.user,
      },
    });
    expect(realm.path.endsWith(filename)).to.be.true;
    realm.close();
    Realm.deleteFile({ path: filename });
  });
});
