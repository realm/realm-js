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

import { expect } from "chai";

import { IndirectWeakMap } from "../IndirectWeakMap";

async function gc() {
  await new Promise(setImmediate);
  if (global.gc) {
    global.gc();
  } else {
    throw new Error("Expected the test to be run with --expose-gc");
  }
}

type TestKey = { hash: number };
type TestValue = { message: string };

describe("IndirectWeakMap", () => {
  it("is possible to test WeakRef", async () => {
    const ref = new WeakRef({ foo: "bar" });
    await gc();
    expect(ref.deref()).equals(undefined);
  });

  it("stores, retrieves and forgets values", async () => {
    const map = new IndirectWeakMap<TestKey, TestValue, number>((k) => k.hash);

    const key1: TestKey = { hash: 1 };
    const key2: TestKey = { hash: 2 };
    const values: TestValue[] = [{ message: "A" }, { message: "B" }];
    map.set(key1, values[0]);
    map.set(key2, values[1]);
    expect(map.get(key1)).equals(values[0]);
    expect(map.get(key2)).equals(values[1]);
    expect(map.has(key1)).equals(true);

    // Forget and garbage collect a value
    delete values[0];
    await gc();

    expect(map.get(key1)).equals(undefined);
    expect(map.get(key2)).equals(values[1]);
    expect(map.has(key1)).equals(false);
    expect(map.has(key2)).equals(true);

    // Try getting a value for a different key object with the same hash
    const key2b: TestKey = { hash: 2 };
    expect(map.get(key2b)).equals(values[1]);
    expect(map.get(key2b)).equals(values[1]);
  });
});
