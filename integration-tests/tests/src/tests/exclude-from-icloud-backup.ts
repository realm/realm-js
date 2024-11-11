////////////////////////////////////////////////////////////////////////////
//
// Copyright 2024 Realm Inc.
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

import Realm from "realm";

const BASE_PATH = "icloud-backup-tests";

describe("icloud backup", () => {
  // This is in a separate suite to avoid
  // See contrib/guide-testing-exclude-icloud-backup.md to verify the result of the test
  it("excludes", () => {
    const realm = new Realm({
      path: `${BASE_PATH}/excluded.realm`,
      schema: [],
      excludeFromIcloudBackup: true,
    });
    realm.close();
  });

  it("removes exclusion", () => {
    const path = `${BASE_PATH}/reincluded.realm`;
    {
      const realm = new Realm({
        path,
        schema: [],
        excludeFromIcloudBackup: true,
      });
      realm.close();
    }
    {
      const realm = new Realm({
        path,
        excludeFromIcloudBackup: false,
      });
      realm.close();
    }
  });
});
