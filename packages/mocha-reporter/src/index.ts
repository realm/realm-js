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

import Mocha from "mocha";

const {
  EVENT_RUN_BEGIN,
  EVENT_RUN_END,
  EVENT_TEST_FAIL,
  EVENT_TEST_PASS,
  EVENT_TEST_PENDING,
  EVENT_SUITE_BEGIN,
  EVENT_SUITE_END,
} = Mocha.Runner.constants;

const Base = Mocha.reporters.base;
const color = Base.color;

// This is mainly an extension of the Spec reporter
class RealmMochaReporter extends Mocha.reporters.Base {
  _indents = 0;
  n = 0;
  constructor(runner: Mocha.Runner, options: any) {
    super(runner, options);
    const stats = runner.stats;

    runner
      .once(EVENT_RUN_BEGIN, () => {
        console.log();
      })
      .on(EVENT_SUITE_BEGIN, (suite) => {
        this.increaseIndent();
        console.log(color("suite", "%s%s"), this.indent(), suite.title);
      })
      .on(EVENT_SUITE_END, () => {
        this.decreaseIndent();
        if (this._indents === 1) {
          console.log();
        }
      })
      .on(EVENT_TEST_PENDING, (test) => {
        const fmt = this.indent() + color("pending", "  - %s");
        console.log(fmt, test.title);
      })
      .on(EVENT_TEST_PASS, (test) => {
        // Test#fullTitle() returns the suite name(s)
        // prepended to the test title
        if (test.speed === "fast") {
          const fmt = this.indent() + color("checkmark", " " + Base.symbols.ok) + color("pass", " %s");
          console.log(fmt, test.title);
        } else {
          const fmt =
            this.indent() +
            color("checkmark", " " + Base.symbols.ok) +
            color("pass", " %s") +
            color(test.speed ?? "", " (%dms)");
          console.log(fmt, test.title, test.duration);
        }
      })
      .on(EVENT_TEST_FAIL, (test, err) => {
        const now = new Date().toISOString();
        console.log(color("light", now) + this.indent() + color("fail", " %d) %s"), ++this.n, test.title);
        console.log(err);
      })
      .once(EVENT_RUN_END, () => {
        this.epilogue();
      });
  }

  indent() {
    return Array(this._indents).join("  ");
  }

  increaseIndent() {
    this._indents++;
  }

  decreaseIndent() {
    this._indents--;
  }
}

// This is the only way mocha will recognize this module
module.exports = RealmMochaReporter;
