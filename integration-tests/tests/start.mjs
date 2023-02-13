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

/* eslint-env node */

import concurrently from "concurrently";

// See https://github.com/kimmobrunfeldt/concurrently/issues/33#issuecomment-433084589

const extraArgs = process.argv.slice(2);

concurrently(
  [{ command: `npm:mocha -- ${extraArgs.map((arg) => `"${arg}"`).join(" ")}` }, { command: "npm:app-importer" }],
  {
    killOthers: ["failure", "success"],
  },
).catch((tasks) => {
  const mocha = tasks.find((t) => t.index === 0);
  process.exit(mocha.exitCode);
});
