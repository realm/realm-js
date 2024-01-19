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

export declare function fetch<RequestBody>(input: string, init?: RequestInit<RequestBody>): void;

export type RequestCredentials = "include" | "omit" | "same-origin";

export interface Headers extends IterableIterator<[string, string]> {
  append(name: string, value: string): void;
  delete(name: string): void;
  get(name: string): string | null;
  has(name: string): boolean;
  set(name: string, value: string): void;
  forEach(callbackfn: (value: string, key: string, parent: Headers) => void): void;
  getSetCookie(): string[];
  keys(): IterableIterator<string>;
  values(): IterableIterator<string>;
  entries(): IterableIterator<[string, string]>;
}

export type FetchHeadersInit = Headers | Record<string, string> /* | string[][] */;

export interface RequestInit<RequestBody = unknown> {
  /**
   * A BodyInit object or null to set request's body.
   */
  body?: RequestBody;
  /**
   * A string indicating whether credentials will be sent with the request always, never, or only when sent to a same-origin URL. Sets request's credentials.
   */
  credentials?: RequestCredentials;
  /**
   * A Headers object, an object literal, or an array of two-item arrays to set request's headers.
   */
  headers?: FetchHeadersInit;
  /**
   * A cryptographic hash of the resource to be fetched by request. Sets request's integrity.
   */
  integrity?: string;
  /**
   * A boolean to set request's keepalive.
   */
  keepalive?: boolean;
  /**
   * A string to set request's method.
   */
  method?: string;
  /**
   * A string to indicate whether the request will use CORS, or will be restricted to same-origin URLs. Sets request's mode.
   */
  // mode?: FetchRequestMode;
  // mode?: unknown;
  /**
   * An AbortSignal to set request's signal.
   */
  // signal?: AbortSignal | null;
  // signal?: unknown;
}
