////////////////////////////////////////////////////////////////////////////
//
// Copyright 2022 Realm Inc.
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

import mocha from "mocha";
import GithubActionsReporter from "mocha-github-actions-reporter";

const base = mocha.reporters.Base;
const color = base.color;

const baseReporter = process.env.CI ? GithubActionsReporter : mocha.reporters.Spec;
class RealmMochaReporter extends baseReporter {
  constructor(runner: Mocha.Runner, options) {
    super(runner, options);

    runner.prependListener(mocha.Runner.constants.EVENT_TEST_FAIL, function (test: mocha.Test, err: any) {
      const now = new Date().toISOString();
      const errorOutput =
        typeof err == "object"
          ? `
      ${color("error message", err.message)},
      ${color("error stack", err.stack)}
      `
          : err;
      test.title += ` ${color("bright yellow", `(${now})`)}
      ${errorOutput}`;
    });
  }
}

module.exports = RealmMochaReporter;
