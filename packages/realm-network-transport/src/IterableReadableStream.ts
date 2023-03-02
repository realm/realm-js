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

import { FetchResponse, ReadableStream } from ".";

// Falling back on a known string used in code transpiled by Babel
const asyncIteratorSymbol = Symbol.asyncIterator || "@@asyncIterator";

const READABLE_STREAM_HANDLER: ProxyHandler<ReadableStream> = {
  get(target, prop, receiver) {
    if (prop === asyncIteratorSymbol) {
      return () => {
        const reader = target.getReader();
        return {
          next() {
            return reader.read();
          },
          async return() {
            await reader.cancel();
            return { done: true, value: null };
          },
        };
      };
    }
    return Reflect.get(target, prop, receiver);
  },
};

/**
 * This method ensures that a ReadableStream is iterable, wraps in a proxy with the {@link Symbol.asyncIterator} if missing.
 * @param response
 * @returns An async iterator.
 */
export function makeStreamIterable(stream: ReadableStream): ReadableStream {
  if (asyncIteratorSymbol in stream) {
    return stream;
  } else if ("getReader" in stream) {
    return new Proxy(stream, READABLE_STREAM_HANDLER);
  } else {
    throw new Error("Expected a `getReader` method on ReadableStream");
  }
}

const RESPONSE_HANDLER: ProxyHandler<FetchResponse> = {
  get(target, prop, receiver) {
    if (prop === "body") {
      const body = target.body;
      if (body) {
        return makeStreamIterable(body);
      }
      return body;
    }
    return Reflect.get(target, prop, receiver);
  },
};

/**
 * This method ensures that a ReadableStream is iterable, wraps in a proxy with the {@link Symbol.asyncIterator} if missing.
 * @param response
 * @returns An async iterator.
 */
export function makeRequestBodyIterable(response: FetchResponse): FetchResponse {
  return new Proxy(response, RESPONSE_HANDLER);
}
