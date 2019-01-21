////////////////////////////////////////////////////////////////////////////
//
// Copyright 2016 Realm Inc.
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

const { expect } = require("chai");

describe("Realm#constructor", () => {
    let realm;

    afterEach(async () => {
        if (realm) {
            // Close the Realm
            realm.close();
            // Delete the file
            try {
                Realm.deleteFile({ path: realm.path });
            } catch (err) {
                // TODO: Fix deletion of Realms on React Native iOS
                console.warn(`Failed to delete Realm file: ${err.message}`);
            }
        }
        // Delete the default Realm
        Realm.clearTestState();
    });

    it("is a function", () => {
        expect(Realm).to.be.a("function");
        expect(Realm instanceof Function).to.equal(true);
    });

    it("creates a Realm instance", () => {
        realm = new Realm();
        expect(realm instanceof Realm).to.equal(true);
        expect(realm.path).to.equal(Realm.defaultPath);
    });

    it("creates a Realm file when called with a non-empty string", async () => {
        realm = new Realm("temporary.realm");
        expect(realm instanceof Realm).to.equal(true);
        const fileExists = await fs.exists(realm.path);
        expect(fileExists).to.equal(true);
        // Expect something about the path
        const defaultPathDir = path.dirname(Realm.defaultPath);
        expect(realm.path).to.equal(path.resolve(defaultPathDir, "temporary.realm"));
    });

    describe("called with invalid arguments", () => {
        it("throws when called with an empty string", () => {
            expect(() => {
                realm = new Realm("");
            }).to.throw(); // The actual message varies across environments
        });

        it("throws when called with two strings", () => {
            expect(() => {
                realm = new Realm("", "");
            }).to.throw("Invalid arguments when constructing 'Realm'");
        });
    });
});
