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

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { assert } from "chai";
import module from "node:module";

const require = module.createRequire(import.meta.url);
const realmPackagePath = require.resolve("realm");
assert(realmPackagePath, "Expected to resolve Realm package");

function expectCleanExit(source: string, timeout: number) {
  execFileSync(process.execPath, ["--eval", source], {
    timeout,
    cwd: fs.mkdtempSync(path.join(os.tmpdir(), "realm-exit-test-")),
    stdio: "inherit",
    env: {
      REALM_PACKAGE_PATH: realmPackagePath,
    },
  });
}

describe("clean exits in Node.js", function () {
  // Repro for https://github.com/realm/realm-js/issues/4535 - currently still failing
  it("exits when creating Realm", function (this: RealmContext) {
    expectCleanExit(
      `
        const Realm = require(process.env.REALM_PACKAGE_PATH);
        const realm = new Realm();
        realm.close();
      `,
      Math.min(this.timeout(), 5000),
    );
  });

  it("exits when creating Realm.App", function (this: RealmContext) {
    expectCleanExit(
      `
        const Realm = require(process.env.REALM_PACKAGE_PATH);
        Realm.flags.ALLOW_CLEAR_TEST_STATE = true;
        new Realm.App({ id: "myapp-abcde" });
        Realm.clearTestState();
      `,
      Math.min(this.timeout(), 5000),
    );
  });
});
