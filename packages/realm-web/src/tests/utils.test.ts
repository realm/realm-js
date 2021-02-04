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
import { inspect } from "util";

import { removeKeysWithUndefinedValues } from "../utils/objects";
import { decodeQueryString, encodeQueryString } from "../utils/string";

describe("utility functions", () => {
    describe("removeKeysWithUndefinedValues", () => {
        const cases: Array<[object, object]> = [
            [
                { a: 1, b: 2 },
                { a: 1, b: 2 },
            ],
            [
                { a: 1, b: 2, c: undefined },
                { a: 1, b: 2 },
            ],
            [{ a: undefined }, {}],
        ];
        for (const c of cases) {
            const [input, expected] = c;
            it(`removes undefined values from ${inspect(input)}`, () => {
                const output = removeKeysWithUndefinedValues(input);
                expect(output).deep.equals(expected);
            });
        }
    });

    describe("encodeQueryString", () => {
        const cases: Array<[object, string]> = [
            [{ a: 1, b: 2 }, "?a=1&b=2"],
            [{ a: 1, b: 2, c: undefined }, "?a=1&b=2"],
            [{ a: undefined }, ""], // Removes the prefix if no defined values are given
        ];
        for (const c of cases) {
            const [input, expected] = c;
            it(`encodes ${inspect(input)}`, () => {
                const output = encodeQueryString(input);
                expect(output).deep.equals(expected);
            });
        }
    });

    describe("decodeQueryString", () => {
        const cases: Array<[string, object]> = [
            ["?a=1&b=2", { a: "1", b: "2" }],
            ["?a=1&b=2&a=3", { a: "3", b: "2" }], // Last occurance wins
            ["", {}],
        ];
        for (const c of cases) {
            const [input, expected] = c;
            it(`decodes ${inspect(input)}`, () => {
                const output = decodeQueryString(input);
                expect(output).deep.equals(expected);
            });
        }
    });
});
