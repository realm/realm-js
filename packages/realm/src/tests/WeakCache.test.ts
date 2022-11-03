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

import { gc } from "./utils";

import { WeakCache } from "../WeakCache";

describe("WeakCache", () => {
  it("constructs, gets and forgets values", async () => {
    class Internal {
      constructor(public $addr: bigint) {}
    }
    class External {
      constructor(public foo: string) {}
    }

    const int1 = new Internal(1n);
    const int1b = new Internal(1n);

    const cache = new WeakCache(External);
    const objs: Record<number, External> = {};
    objs[0] = cache.get(int1, ["bar"]);
    expect(objs[0].foo).equals("bar");
    // Getting again with another key sharing the $addr should return the same object
    objs[1] = cache.get(int1b, ["baz"]);
    expect(objs[1]).equals(objs[0]);
    // And it shouldn't update the object
    expect(objs[1].foo).equals("bar");
    // Getting again without providing constructor args should return the same object
    objs[2] = cache.get(int1);
    expect(objs[2]).equals(objs[0]);

    // Forgetting the previously returned values, should make the cache forget the original object
    delete objs[0];
    delete objs[1];
    delete objs[2];
    await gc();
    await gc();

    // Now that the object is pruned from cache, we need to supply constructor arguments when getting it
    expect(() => {
      cache.get(int1);
    }).throws("Needed to create an object, but no args were supplied");
  });
});
