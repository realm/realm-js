////////////////////////////////////////////////////////////////////////////
//
// Copyright 2024 Realm Inc.
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

import type { Response } from "@realm/fetch";

// Falling back on a known string used in code transpiled by Babel
const asyncIteratorSymbol: typeof Symbol.asyncIterator = Symbol.asyncIterator || "@@asyncIterator";

/** @internal */
export function asyncIteratorFromResponse({ body }: Response): AsyncIterable<Uint8Array> {
  if (typeof body !== "object" || body === null) {
    throw new Error("Expected a non-null object");
  } else if (Symbol.asyncIterator in body) {
    return body as AsyncIterable<Uint8Array>;
  } else if ("getReader" in body) {
    return {
      [asyncIteratorSymbol]() {
        const reader = body.getReader();
        return {
          async next() {
            const { done, value } = await reader.read();
            if (done) {
              // TODO: Simply return the result once https://github.com/microsoft/TypeScript-DOM-lib-generator/pull/1676 is merged and released
              return { done, value: undefined };
            } else if (value instanceof Uint8Array) {
              return { done, value };
            } else {
              throw new Error("Expected value to be Uint8Array");
            }
          },
          async return() {
            await reader.cancel();
            return { done: true, value: null };
          },
        };
      },
    };
  } else {
    throw new Error("Expected an AsyncIterable or a ReadableStream");
  }
}
