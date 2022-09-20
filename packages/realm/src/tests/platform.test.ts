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

import { isAbsolute } from "node:path";
import { existsSync } from "node:fs";

import { Realm } from "../index";
import { expect } from "chai";

describe("platform specifics", () => {
  describe("default path", () => {
    it("is absolute", () => {
      const realm = new Realm();
      const realmPath = realm.path;
      try {
        expect(realmPath).satisfies(isAbsolute);
        expect(realmPath).satisfies(existsSync);
        Realm.deleteFile({});
        expect(realmPath).not.satisfies(existsSync);
      } finally {
        realm.close();
      }
    });
  });
});
