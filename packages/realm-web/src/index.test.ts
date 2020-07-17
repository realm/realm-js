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

import * as Realm from ".";

describe("Realm Web module", () => {
    it("expose the App constructor", () => {
        expect(typeof Realm.App).equals("function");
    });

    describe("Credentials", () => {
        it("expose a credentials factory", () => {
            expect(typeof Realm.Credentials).equals("function");
        });
    });

    describe("static app function", () => {
        it("return the same App instance only if ids match", () => {
            const app1 = Realm.getApp("default-app-id");
            expect(app1).to.be.instanceOf(Realm.App);
            const app2 = Realm.getApp("default-app-id");
            expect(app2).equals(app1);
            const app3 = Realm.getApp("another-app-id");
            expect(app2).to.not.equal(app3);
        });
    });
});
