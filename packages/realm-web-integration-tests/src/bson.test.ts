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
import { BSON } from "realm-web";

describe("BSON", () => {
    it("gets exported", () => {
        expect(typeof BSON).equals("object");
    });

    it("can construct an ObjectId", () => {
        const objectId = new BSON.ObjectId();
        expect(objectId).instanceOf(BSON.ObjectId);
        expect(typeof objectId.toHexString()).equals("string");
    });

    it("can parse EJSON", () => {
        const result = BSON.EJSON.parse('{ "int32": { "$numberInt": "10" } }', {
            relaxed: false,
        }) as { int32: BSON.Int32 };
        expect(typeof result).equals("object");
        expect(typeof result.int32).equals("object");
        expect(result.int32).instanceOf(BSON.Int32);
    });
});
