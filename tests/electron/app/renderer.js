////////////////////////////////////////////////////////////////////////////
//
// Copyright 2021 Realm Inc.
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

const { app } = require("electron");

const remote = require("electron").remote;

process.on("uncaughtException", (error) => {
  console.log(error);
  process.exit(-1);
});

const options = remote.getGlobal("options");
if (options.runIn === "render") {
  const jasmine = require("./jasmine.js").execute(options.filter);
  jasmine.onComplete((passed) => {
    let success = passed ? 0 : -1;
    console.log(`\nTesting completed in renderer process with status ${success}`);
    process.exit(success);
  });
}
