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

const jasmineReporters = require("jasmine-reporters");
const { SpecReporter } = require("jasmine-spec-reporter");

jasmine.getEnv().clearReporters();
jasmine.getEnv().addReporter(
  new jasmineReporters.JUnitXmlReporter({
    savePath: ".",
    consolidateAll: false,
  }),
);
jasmine.getEnv().addReporter(
  new SpecReporter({
    spec: {
      displayPending: true,
    },
    summary: {
      displayStacktrace: true,
    },
  }),
);
