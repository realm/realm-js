////////////////////////////////////////////////////////////////////////////
//
// Copyright 2023 Realm Inc.
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

import { createPromiseChain } from "./promise-chain";

describe("promise chain util", () => {
  it("is callable then awaitable", async () => {
    const chain = createPromiseChain<[string]>();
    chain("hello");
    chain("hi");
    await expect(chain).eventually.deep.equals(["hello"]);
    await expect(chain).eventually.deep.equals(["hi"]);
  });

  it("is awaitable then callable", async () => {
    const chain = createPromiseChain<[string]>();
    const promises = [expect(chain).eventually.deep.equals(["hello"]), expect(chain).eventually.deep.equals(["hi"])];
    chain("hello");
    chain("hi");
    await Promise.all(promises);
  });

  it("can expect an amount of calls", async () => {
    const chain = createPromiseChain<[string]>(1);
    chain("hello");
    expect(() => chain("hi")).throws();
  });
});
