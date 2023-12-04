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
import { createListenerStub } from "./listener-stub";
import { createPromiseHandle } from "./promise-handle";

describe("listener stub", () => {
  it("calls callbacks in sequence and resolves a handle", async () => {
    const handle = createPromiseHandle();
    let call = 0;

    const stub = createListenerStub(
      handle,
      () => {
        expect(call).equals(0);
        call++;
      },
      () => {
        expect(call).equals(1);
        call++;
      },
    );

    stub();
    stub();
    await handle;
  });

  it("rejects promise handle if callback throws", async () => {
    const handle = createPromiseHandle();

    const stub = createListenerStub(handle, () => {
      throw new Error("Boom");
    });

    stub();
    await expect(handle).eventually.rejectedWith("Boom");
  });

  it("rejects promise handle if called more than callbacks provided", async () => {
    const handle = createPromiseHandle();

    const stub = createListenerStub(handle, () => {
      /* tumbleweed */
    });

    stub();
    stub();
    await expect(handle).eventually.rejectedWith("Listener callback was unexpectedly called");
  });
});
