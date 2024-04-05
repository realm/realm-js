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

import { execSync } from "child_process";

describe("Clean exit for Node.js scripts", function () {
  // Repro for https://github.com/realm/realm-js/issues/4535 - currently still failing
  it.skip("exits cleanly when creating a new Realm.App", function () {
    execSync(
      `node -e 'const Realm = require("realm"); const app = new Realm.App({ id: "myapp-abcde" }); Realm.clearTestState();'`,
      {
        timeout: Math.min(this.timeout(), 5000),
      },
    );
  });
});
