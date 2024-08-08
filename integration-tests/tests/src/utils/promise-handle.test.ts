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
import { createPromiseHandle } from "./promise-handle";
import { sleep } from "./sleep";

describe("PromiseHandle", () => {
  it("resolves", async () => {
    const handle = createPromiseHandle<string>();
    handle.resolve("value");
    await expect(handle).eventually.equals("value");
  });

  it("resolves asynchronously", async () => {
    const handle = createPromiseHandle<string>();
    const expectation = expect(handle).eventually.equals("value");
    await sleep(10);
    handle.resolve("value");
    await expectation;
  });

  it("rejects", async () => {
    const handle = createPromiseHandle();
    handle.reject(new Error("err"));
    await expect(handle).rejectedWith("err");
  });
});
