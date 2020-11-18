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

import { Storage } from "../storage/Storage";
import { MemoryStorage } from "../storage/MemoryStorage";
import { PrefixedStorage } from "../storage/PrefixedStorage";

describe("Storage", () => {
    describe("MemoryStorage", function () {
        let storage: Storage;

        before(() => {
            storage = new MemoryStorage();
        });

        it("returns null before a value is set", () => {
            expect(storage.get("something")).equals(null);
        });

        it("sets and gets the correct value", () => {
            storage.set("something", "good");
            expect(storage.get("something")).equals("good");
        });

        it("removes the correct value", () => {
            storage.set("something else", "is still there");
            expect(storage.get("something")).equals("good");
            storage.remove("something");
            expect(storage.get("something")).equals(null);
            expect(storage.get("something else")).equals("is still there");
        });

        it("clears the right values", () => {
            storage.clear("nothing");
            expect(storage.get("something else")).equals("is still there");
            storage.clear("something");
            expect(storage.get("something else")).equals(null);
        });
    });

    describe("PrefixedStorage", () => {
        let parentStorage: Storage;
        let storage: Storage;

        before(() => {
            parentStorage = new MemoryStorage();
            parentStorage.set("unremovable", "remains!");
            storage = new PrefixedStorage(parentStorage, "key-prefix");
        });

        it("returns null before a value is set", () => {
            expect(storage.get("something")).equals(null);
            expect(parentStorage.get("key-prefix:something")).equals(null);
        });

        it("sets and gets the correct value", () => {
            storage.set("something", "good");
            expect(storage.get("something")).equals("good");
            expect(parentStorage.get("key-prefix:something")).equals("good");
        });

        it("removes the correct value", () => {
            storage.set("something else", "is still there");
            expect(storage.get("something")).equals("good");
            expect(parentStorage.get("key-prefix:something")).equals("good");
            storage.remove("something");
            expect(storage.get("something")).equals(null);
            expect(parentStorage.get("key-prefix:something")).equals(null);
            expect(storage.get("something else")).equals("is still there");
            expect(parentStorage.get("key-prefix:something else")).equals(
                "is still there",
            );
        });

        it("clears the right values", () => {
            storage.set("another", "value");
            storage.clear("nothing");
            expect(storage.get("something else")).equals("is still there");
            storage.clear("something");
            expect(storage.get("something else")).equals(null);
            expect(parentStorage.get("key-prefix:something else")).equals(null);
            expect(storage.get("another")).equals("value");
            storage.clear();
            expect(storage.get("another")).equals(null);
            expect(parentStorage.get("unremovable")).equals("remains!");
        });
    });
});
