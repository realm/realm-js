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

import { describeIf } from "./utils";
import { LocalStorage, getEnvironment } from "realm-web";
import { expect } from "chai";

describeIf(typeof LocalStorage !== "undefined", "Environment", () => {
    it("default storage writes to local storage", () => {
        const { defaultStorage } = getEnvironment();
        defaultStorage.set("some-key", "some-value");
        expect(localStorage.getItem("realm-web:some-key")).equals("some-value");
        defaultStorage.clear();
    });
});
