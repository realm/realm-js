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

import { suite, add, cycle, configure } from "benny";

import { openRealmBefore } from "../hooks";

type Config = Parameters<typeof configure>[0];

// Increase the following `performanceMaxTime` value to increase confidence
const { performanceMaxTime } = environment;
const maxTimeMs = parseInt(typeof performanceMaxTime === "string" ? performanceMaxTime : "1000", 10);

export function benchmark(title: string, fn: () => void | Promise<void>, config?: Config): void {
  it(title, async function (this: BenchmarkContext) {
    this.timeout(maxTimeMs + 1000).slow(maxTimeMs * 3);
    this.summary = await suite(
      title,
      configure({
        cases: {
          maxTime: maxTimeMs / 1000,
          ...config?.cases,
        },
        ...config,
      }),
      add(title, fn.bind(this)),
      cycle((result) => {
        const ops = result.ops.toLocaleString(undefined, {
          maximumFractionDigits: 0,
        });
        const margin = result.margin;
        this.test.title += ` (${ops} ops/sec, ±${margin}%)`;
      }),
    );
  });
}

type PerformanceTestParameters = {
  benchmarkTitle: string;
  // Schema to use when opening the Realm
  schema: Realm.ObjectSchema[];
  // Prepare the realm to be tested (creating any objects that shouldn't be a part of the operation)
  before(this: RealmContext): void;
  // Perform the actual test
  test(this: RealmObjectContext): void;
};

export function describePerformance(title: string, parameters: PerformanceTestParameters): void {
  describe(title, () => {
    openRealmBefore({
      schema: parameters.schema,
    });
    before(parameters.before);
    benchmark(parameters.benchmarkTitle, parameters.test);
    after(function (this: BenchmarkContext) {
      // console.log(this.summary);
    });
  });
}
