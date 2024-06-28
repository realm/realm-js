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

import { createPromiseHandle, PromiseHandle } from "./promise-handle";

type MockCall<ArgsType extends Array<unknown>> = {
  args: ArgsType;
};

type MockFunction<ArgsType extends Array<unknown>, ReturnType> = {
  (...args: ArgsType): ReturnType;
  calls: Array<MockCall<ArgsType>>;
  nextCall: PromiseHandle<MockCall<ArgsType>>;
};

export function createMockFunction<ArgsType extends Array<unknown>, ReturnType>(
  expectedCalls?: Array<ReturnType>,
): MockFunction<ArgsType, ReturnType> {
  function mock(...args: ArgsType): ReturnType {
    mock.calls.push({ args });
    mock.nextCall.resolve({ args });
    // Create a new handle for the next promise
    mock.nextCall = createPromiseHandle();
    if (Array.isArray(expectedCalls)) {
      if (mock.calls.length > expectedCalls.length) {
        throw new Error(`Did not expect to be called ${mock.calls.length} times`);
      } else {
        return expectedCalls[mock.calls.length - 1];
      }
    } else {
      return undefined as ReturnType;
    }
  }
  mock.calls = [] as Array<MockCall<ArgsType>>;
  mock.nextCall = createPromiseHandle<MockCall<ArgsType>>();
  return mock;
}
