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

import BM from "benchmark";

import { openRealmBefore } from "../hooks";

type Options = ConstructorParameters<typeof BM.Suite>[1];

// Increase the following `performanceMaxTime` value to increase confidence
const { performanceMaxTime } = environment;
const maxTimeMs = parseInt(typeof performanceMaxTime === "string" ? performanceMaxTime : "1000", 10);

export function benchmark(title: string, fn: () => void | Promise<void>, options?: Options): void {
  it(title, async function (this: Partial<BenchmarkContext> & Mocha.Context) {
    this.timeout(maxTimeMs + 1000).slow(maxTimeMs * 3);
    // For some (still to be discovered) reason, require("lodash") returns `null` when called from runInContext inside `benchmark`
    const Benchmark = BM.runInContext({ _: require("lodash") }) as typeof BM;
    if (!Benchmark.Suite) {
      throw new Error("Failed to load Benchmark correctly");
    }

    const suite = new Benchmark.Suite(undefined, {
      ...options,
    }).add(title, fn.bind(this), {
      maxTime: maxTimeMs / 1000,
    });

    this.benchmark = await new Promise<BM>((resolve, reject) => {
      suite
        .on("complete", ({ target }: { target: BM }) => {
          const ops = target.hz.toLocaleString(undefined, {
            maximumFractionDigits: 0,
          });
          const rme = Number(target.stats.rme.toFixed(2));
          this.test.title += ` (${ops} ops/sec, ±${rme}%)`;
          resolve(target);
        })
        .on("error", (err: unknown) => {
          console.error({ err });
          reject(err);
        })
        .run();
    });
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
