////////////////////////////////////////////////////////////////////////////
//
// Copyright 2020 Realm Inc.
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

import { makeRequestBodyIterable } from "./IterableReadableStream";
import { deriveStatusText } from "./status-text";
import type {
  NetworkTransport,
  Request,
  ResponseHandler,
  Headers,
  Fetch,
  AbortController,
  FetchResponse,
} from "./types";

export class DefaultNetworkTransport implements NetworkTransport {
  public static fetch: Fetch;
  public static AbortController: AbortController;
  public static extraFetchOptions: Record<string, unknown> | undefined;

  public static DEFAULT_HEADERS = {
    "Content-Type": "application/json",
  };

  private static createTimeoutSignal(timeoutMs: number | undefined) {
    if (typeof timeoutMs === "number") {
      const controller = new DefaultNetworkTransport.AbortController();
      // Call abort after a specific number of milliseconds
      const timeout = setTimeout(() => {
        controller.abort();
      }, timeoutMs);
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

  constructor() {
    if (!DefaultNetworkTransport.fetch) {
      throw new Error("DefaultNetworkTransport.fetch must be set before it's used");
    }
    if (!DefaultNetworkTransport.AbortController) {
      throw new Error("DefaultNetworkTransport.AbortController must be set before it's used");
    }
  }

  /** @deprecated Not used by the `bindgen` SDK and can be deleted */
  public fetchWithCallbacks<RequestBody = unknown>(request: Request<RequestBody>, handler: ResponseHandler): void {
    // Tslint:disable-next-line: no-console
    this.fetch(request)
      .then(async (response) => {
        const decodedBody = await response.text();
        // Pull out the headers of the response
        const responseHeaders: Headers = {};
        response.headers.forEach((value, key) => {
          responseHeaders[key] = value;
        });
        return {
          statusCode: response.status,
          headers: responseHeaders,
          body: decodedBody,
        };
      })
      .then((r) => handler.onSuccess(r))
      .catch((e) => handler.onError(e));
  }

  public async fetch<RequestBody = unknown>(request: Request<RequestBody>): Promise<FetchResponse> {
    const { timeoutMs, url, ...rest } = request;
    const { signal, cancelTimeout } = DefaultNetworkTransport.createTimeoutSignal(timeoutMs);
    try {
      // Awaiting the response to cancel timeout on errors
      const response = await DefaultNetworkTransport.fetch(url, {
        ...DefaultNetworkTransport.extraFetchOptions,
        signal, // Used to signal timeouts
        ...rest,
      });
      // A bug in the React Native fetch polyfill leaves the statusText empty
      if (response.statusText === "") {
        const statusText = deriveStatusText(response.status);
        // @ts-expect-error Assigning to a read-only property
        response.statusText = statusText;
      }
      // Wraps the body of the request in an iterable interface
      return makeRequestBodyIterable(response);
    } finally {
      // Whatever happens, cancel any timeout
      cancelTimeout();
    }
  }
}
