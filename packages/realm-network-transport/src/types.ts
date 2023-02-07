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

export type Method = "GET" | "POST" | "DELETE" | "PUT" | "PATCH";

export type Headers = { [name: string]: string };

export interface Request<RequestBody = unknown> extends FetchRequestInit<RequestBody> {
  method: Method;
  url: string;
  timeoutMs?: number;
}

export interface CallbackResponse {
  statusCode: number;
  headers: Headers;
  body: string;
}

export type SuccessCallback = (response: CallbackResponse) => void;

export type ErrorCallback = (err: Error) => void;

export interface ResponseHandler {
  onSuccess: SuccessCallback;
  onError: ErrorCallback;
}

export interface NetworkTransport {
  fetch<RequestBody>(request: Request<RequestBody>): Promise<FetchResponse>;
  fetchWithCallbacks<RequestBody>(request: Request<RequestBody>, handler: ResponseHandler): void;
}

// AbortController

type AbortSignal = unknown;

/** A controller object that allows you to abort one or more DOM requests as and when desired. */

export type AbortController = {
  /**
   * The prototype of an instance is the class.
   */
  prototype: AbortController;

  /**
   * Constructs an AbortController.
   */
  new (): AbortController;

  /**
   * Returns the AbortSignal object associated with this object.
   */
  readonly signal: AbortSignal;
  /**
   * Invoking this method will set this object's AbortSignal's aborted flag and signal to any observers that the associated activity is to be aborted.
   */
  abort(): void;
};

// Environment independent Fetch API

type FetchRequestInfo = FetchRequest | string;
type FetchHeadersInit = FetchHeaders | string[][] | Record<string, string>;
type FetchRequestCredentials = "include" | "omit" | "same-origin";
type FetchRequestMode = "cors" | "navigate" | "no-cors" | "same-origin";
type FetchReadableStream = unknown;

interface FetchBody {
  readonly body: FetchReadableStream | null;
  readonly bodyUsed: boolean;
  arrayBuffer(): Promise<ArrayBuffer>;
  blob(): Promise<unknown>;
  json<ResponseBody = unknown>(): Promise<ResponseBody>;
  text(): Promise<string>;
}

export interface FetchHeaders {
  append(name: string, value: string): void;
  delete(name: string): void;
  get(name: string): string | null;
  has(name: string): boolean;
  set(name: string, value: string): void;
  forEach(callback: (value: string, name: string) => void): void;
}

/** This Fetch API interface represents a resource request. */
export interface FetchRequest extends FetchBody {
  /**
   * Returns a Headers object consisting of the headers associated with request. Note that headers added in the network layer by the user agent will not be accounted for in this object, e.g., the "Host" header.
   */
  readonly headers: FetchHeaders;
  /**
   * Returns a boolean indicating whether or not request can outlive the global in which it was created.
   */
  readonly keepalive: boolean;
  /**
   * Returns request's HTTP method, which is "GET" by default.
   */
  readonly method: string;
  /**
   * Returns the signal associated with request, which is an AbortSignal object indicating whether or not request has been aborted, and its abort event handler.
   */
  readonly signal: AbortSignal;
  /**
   * Returns the URL of request as a string.
   */
  readonly url: string;
  clone(): FetchRequest;
}

export interface FetchResponse extends FetchBody {
  readonly headers: FetchHeaders;
  readonly ok: boolean;
  readonly redirected: boolean;
  readonly status: number;
  readonly statusText: string;
  readonly type: unknown;
  readonly url: string;
  clone(): FetchResponse;
}

interface FetchRequestInit<RequestBody = unknown> {
  /**
   * A BodyInit object or null to set request's body.
   */
  body?: RequestBody;
  /**
   * A string indicating whether credentials will be sent with the request always, never, or only when sent to a same-origin URL. Sets request's credentials.
   */
  credentials?: FetchRequestCredentials;
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
  mode?: FetchRequestMode;
  /**
   * An AbortSignal to set request's signal.
   */
  signal?: AbortSignal | null;
}

export type Fetch = (input: FetchRequestInfo, init?: FetchRequestInit) => Promise<FetchResponse>;
