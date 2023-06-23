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

import type { BenchmarkOpts } from "@thi.ng/bench";

import { openRealmBefore } from "../hooks";

// Increase the following `performanceMaxTime` value to increase confidence
const { performanceMaxTime } = environment;
const maxTimeMs = parseInt(typeof performanceMaxTime === "string" ? performanceMaxTime : "1000", 10);

const DEFAULT_OPTIONS: Partial<BenchmarkOpts> = { output: false, iter: 1000, size: 1000 };

export function itPerforms(title: string, fn: () => void, options?: Partial<BenchmarkOpts>): void {
  it(title, async function (this: Partial<BenchmarkContext> & Mocha.Context) {
    const { benchmark } = await import("@thi.ng/bench");
    this.timeout("1m").slow("1m");
    const result = benchmark(fn.bind(this), { ...DEFAULT_OPTIONS, ...options });
    const hz = (result.iter * result.size) / (result.total / 1000);
    const ops = hz.toLocaleString("en-US", {
      maximumFractionDigits: 0,
    });
    const sd = Number(result.sd.toFixed(2));
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.test!.title += ` (${ops} ops/sec, ±${sd}%)`;
    this.result = result;
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
    itPerforms(parameters.benchmarkTitle, parameters.test);
    after(function (this: BenchmarkContext) {
      // Console.log(this.summary);
    });
  });
}
