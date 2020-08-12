////////////////////////////////////////////////////////////////////////////
//
// Copyright 2020 Realm Inc.
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

import { AppStorage } from "../AppStorage";
import { MemoryStorage } from "../storage";

describe("AppStorage", () => {
    describe("user ids", () => {
        it("can be set with merging, retrieved, removed and set without merging", () => {
            const baseStorage = new MemoryStorage();
            // Add two existing user ids
            baseStorage.set(
                "app(default-app-id):userIds",
                JSON.stringify(["a", "b", "c"]),
            );
            const storage = new AppStorage(baseStorage, "default-app-id");

            // Inserting updating by adding two new users (d and e)
            storage.setUserIds(["c", "d", "e"], true);
            // We expect the three newly updated ids to be stored and any existing to be at the end of the array
            expect(storage.getUserIds()).deep.equals(["c", "d", "e", "a", "b"]);
            // Remove a single user
            storage.removeUserId("e");
            expect(storage.getUserIds()).deep.equals(["c", "d", "a", "b"]);
            // Empty the list of users
            storage.setUserIds([], false);
            expect(storage.getUserIds()).deep.equals([]);
        });
    });
});
