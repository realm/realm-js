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

import { Credentials } from "./Credentials";

describe("Credentials", () => {
    it("expose the anonymous credentials", () => {
        expect(typeof Credentials.anonymous).to.equal("function");
        const credentials = Credentials.anonymous();
        expect(credentials).to.be.instanceOf(Credentials);
        expect(credentials.payload).deep.equals({});
    });

    it("expose the email/password credentials", () => {
        expect(typeof Credentials.emailPassword).to.equal("function");
        const credentials = Credentials.emailPassword(
            "gilfoil@testing.mongodb.com",
            "s3cr3t",
        );
        expect(credentials).to.be.instanceOf(Credentials);
        expect(credentials.payload).deep.equals({
            username: "gilfoil@testing.mongodb.com",
            password: "s3cr3t",
        });
    });
});
