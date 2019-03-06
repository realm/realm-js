////////////////////////////////////////////////////////////////////////////
//
// Copyright 2019 Realm Inc.
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
import * as uuid from "uuid";

import { withROS } from "./utils/with-ros";

describe("Realm.Sync.User", () => {
    it("defines the login function", () => {
        expect(Realm.Sync).to.not.equal(undefined);
        expect(Realm.Sync.User).to.not.equal(undefined);
        expect(Realm.Sync.User.login).to.be.a("function");
    });

    withROS.it(
        "can authenticate using the nickname provider",
        async function () {
            const nickname = `realm-js-tests-${uuid()}`;
            const credentials = Realm.Sync.Credentials.nickname(nickname);
            const user = await Realm.Sync.User.login(this.ros.url, credentials);
            const serializedUser = user.serialize() as Realm.Sync.SerializedUser;
            expect(serializedUser.identity).to.be.a("string");
            expect(serializedUser.refreshToken).to.be.a("string");
            expect(serializedUser.isAdmin).to.equal(false);
        }
    );
});
