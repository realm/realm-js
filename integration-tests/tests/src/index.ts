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

console.log("Loading Realm Integration Tests");

import "./setup-globals";

afterEach(() => {
  // Trigger garbage collection after every test, if exposed by the environment.
  if (typeof global.gc === "function") {
    global.gc();
  }
});

import "./utils/import-app.test";
import "./utils/chai-plugin.test";

import "./tests";
// TODO: Uncomment when the Metro config has been updated to load ESM
// or the performance tests no longer use an ESM dependency.
// import "./performance-tests";
