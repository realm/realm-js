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

if (!global.Realm) {
    throw new Error("Expected 'Realm' to be available as a global");
}

if (!global.title) {
    throw new Error("Expected 'title' to be available as a global");
}

if (!global.fs) {
    throw new Error("Expected 'fs' to be available as a global");
}

if (!global.path) {
    throw new Error("Expected 'path' to be available as a global");
}

if (!global.environment || typeof global.environment !== "object") {
    throw new Error("Expected 'environment' to be available as a global");
}

// Patch in a function that can skip running tests in specific environments
import { skipIf } from "./utils/skip-if";
global.it.skipIf = skipIf;

describe(global.title, () => {
    require("./realm-constructor");
    require("./iterators");
    require("./dynamic-schema-updates");
});

beforeEach(() => {
    Realm.clearTestState();
});
