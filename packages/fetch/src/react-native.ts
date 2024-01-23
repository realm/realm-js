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

import type * as types from "./types";

// The sole purpose of this line is to verify types
globalThis.fetch satisfies typeof types.fetch<BodyInit_, Headers, AbortSignal, Response>;

type ReactNativeRequestInit = {
  reactNative?: { textStreaming: boolean };
} & RequestInit;

export async function fetch(input: RequestInfo, init: ReactNativeRequestInit = {}) {
  // Setting additional options to signal to the RN fetch polyfill that it shouldn't consider the response a "blob"
  // see https://github.com/react-native-community/fetch/issues/15
  init.reactNative = { textStreaming: true };

  const response = await globalThis.fetch(input, init);
  if (!response.statusText) {
    Object.assign(response, { status: getStatusText(response.status) });
  }
  return response;
}

export const Headers = globalThis.Headers satisfies typeof types.Headers;

class PolyfilledAbortSignal extends AbortSignal {
  static timeout(ms: number): PolyfilledAbortSignal {
    const controller = new AbortController();
    setTimeout(() => {
      controller.abort();
    }, ms);
    return controller.signal;
  }
}

PolyfilledAbortSignal satisfies typeof types.AbortSignal;
export { PolyfilledAbortSignal as AbortSignal };

const ReactNativeAbortController = AbortController satisfies typeof types.AbortController<AbortSignal>;
export { ReactNativeAbortController as AbortController };

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Status
 */
const HTTP_STATUS_TEXTS: Record<number, string | undefined> = {
  100: "Continue",
  101: "Switching Protocols",
  102: "Processing",
  200: "OK",
  201: "Created",
  202: "Accepted",
  203: "Non-Authoritative Information",
  204: "No Content",
  205: "Reset Content",
  206: "Partial Content",
  300: "Multiple Choices",
  301: "Moved Permanently",
  302: "Found",
  303: "See Other",
  304: "Not Modified",
  307: "Temporary Redirect",
  308: "Permanent Redirect",
  400: "Bad Request",
  401: "Unauthorized",
  402: "Payment Required",
  403: "Forbidden",
  404: "Not Found",
  405: "Method Not Allowed",
  406: "Not Acceptable",
  407: "Proxy Authentication Required",
  408: "Request Timeout",
  409: "Conflict",
  410: "Gone",
  411: "Length Required",
  412: "Precondition Failed",
  413: "Payload Too Large",
  414: "URI Too Long",
  415: "Unsupported Media Type",
  416: "Range Not Satisfiable",
  417: "Expectation Failed",
  418: "I'm a teapot",
  422: "Unprocessable Entity",
  425: "Too Early",
  426: "Upgrade Required",
  429: "Too Many Requests",
  431: "Request Header Fields Too Large",
  451: "Unavailable For Legal Reasons",
  500: "Internal Server Error",
  501: "Not Implemented",
  502: "Bad Gateway",
  503: "Service Unavailable",
  504: "Gateway Timeout",
  505: "HTTP Version Not Supported",
  506: "Variant Also Negotiates",
  507: "Insufficient Storage",
  508: "Loop Detected",
  510: "Not Extended",
  511: "Network Authentication Required",
};

export function getStatusText(status: number): string | undefined {
  return HTTP_STATUS_TEXTS[status];
}
