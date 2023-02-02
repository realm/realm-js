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

import * as network from "../platform/network";

import { binding, extendDebug } from "../internal";

const debug = extendDebug("network");

const HTTP_METHOD: Record<binding.HttpMethod, string> = {
  [binding.HttpMethod.get]: "get",
  [binding.HttpMethod.post]: "post",
  [binding.HttpMethod.put]: "put",
  [binding.HttpMethod.patch]: "patch",
  [binding.HttpMethod.del]: "delete",
};

function flattenHeaders(headers: Headers) {
  const result: Record<string, string> = {};
  headers.forEach((value: string, key: string) => {
    result[key] = value;
  });
  return result;
}

function createTimeoutSignal(timeoutMs: bigint | undefined) {
  if (typeof timeoutMs === "bigint") {
    const controller = new AbortController();
    // Call abort after a specific number of milliseconds
    const timeout = setTimeout(() => {
      controller.abort();
    }, Number(timeoutMs));
    return {
      signal: controller.signal,
      cancelTimeout: () => {
        clearTimeout(timeout);
      },
    };
  } else {
    return {
      signal: undefined,
      cancelTimeout: () => {
        /* No-op */
      },
    };
  }
}

network.inject({
  async fetch(request): Promise<network.Response> {
    debug("requesting", request);
    const { signal, cancelTimeout } = createTimeoutSignal(request.timeoutMs);
    try {
      const response = await fetch(request.url, {
        body: request.body,
        method: HTTP_METHOD[request.method],
        headers: request.headers,
        signal,
        // @see https://github.com/realm/realm-js/pull/4155 for context
        reactNative: { textStreaming: true },
      } as RequestInit); // Need the type assertion to allow adding the `reactNative` property
      const responseHeaders = flattenHeaders(response.headers);
      debug("responded", {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
      const decodedBody = await response.text();
      return {
        body: decodedBody,
        headers: responseHeaders,
        httpStatusCode: response.status,
        // TODO: Determine if we want to set this differently
        customStatusCode: 0,
      };
    } finally {
      // Whatever happens, cancel any timeout
      cancelTimeout();
    }
  },
});
