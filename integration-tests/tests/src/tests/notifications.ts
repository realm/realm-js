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

import { openRealmBefore } from "../hooks";

type Person = { name: string };

describe("Realm notifications", () => {
  openRealmBefore({
    schema: [
      {
        name: "Person",
        properties: { name: "string" },
      },
    ],
  });

  it("allows adding listeners in a write transaction", function (this: RealmContext) {
    function noop() {}
    this.realm.write(() => {
      const alice = this.realm.create<Person>("Person", { name: "Alice" });
      alice.addListener(noop);
    });
  });

  it("doesn't fire an initial notification", function (this: RealmContext) {
    this.timeout(60 * 1000);

    function listener() {
      throw new Error("Listener fired unexpectedly");
    }
    const alice = this.realm.write(() => this.realm.create<Person>("Person", { name: "Alice" }));
    alice.addListener(listener);
    // Perform a write to advance the database version
    this.realm.write(() => {});
  });
});
