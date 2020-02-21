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

const EXPECTED_GLOBALS = {
    Realm: "function",
    title: "string",
    fs: "object",
    path: "object",
    environment: "object",
    setTimeout: "function",
    clearTimeout: "function"
};

for (const [p, expectedType] of Object.entries(EXPECTED_GLOBALS)) {
    if (typeof (global as any)[p] !== expectedType) {
        throw new Error(`Expected '${p}' of type ${expectedType} on global`);
    }
}

// Patch in a function that can skip running tests in specific environments
import { skipIf } from "./utils/skip-if";
global.it.skipIf = skipIf;

describe(global.title, () => {
    require("./realm-constructor");
    require("./iterators");
    require("./dynamic-schema-updates");
    require("./results-listeners");
});

beforeEach(() => {
    Realm.clearTestState();
});
