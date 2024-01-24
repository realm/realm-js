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

export type ResponseType = "basic" | "cors" | "default" | "error" | "opaque" | "opaqueredirect";
export type RequestCredentials = "include" | "omit" | "same-origin";
export type RequestMode = "cors" | "navigate" | "no-cors" | "same-origin";

export type RequestBody = ReadableStream | string | null; // TODO: Add TypedArray

declare class AbortSignal {
  static timeout(time: number): AbortSignal;
  /**
   * Returns true if this AbortSignal's AbortController has signaled to abort, and false otherwise.
   */
  readonly aborted: boolean;

  // The following properties are optional because they're missing from the react-native types
  readonly reason?: unknown;
  throwIfAborted?(): void;
}

export { AbortSignal };

declare class AbortController<PlatformAbortSignal = AbortSignal> {
  /**
   * Returns the AbortSignal object associated with this object.
   */
  readonly signal: PlatformAbortSignal;

  /**
   * Invoking this method will set this object's AbortSignal's aborted flag and signal to any observers that the associated activity is to be aborted.
   */
  abort(): void;
}

export { AbortController };

export declare class Headers {
  append(name: string, value: string): void;
  delete(name: string): void;
  get(name: string): string | null;
  has(name: string): boolean;
  set(name: string, value: string): void;
  forEach(callbackfn: (value: string, key: string, parent: this) => void): void;
  getSetCookie?(): string[];
  keys?(): IterableIterator<string>;
  values?(): IterableIterator<string>;
  entries?(): IterableIterator<[string, string]>;
  [Symbol.iterator]?(): Iterator<[string, string]>;
}

export type Blob = unknown;
export type FormData = unknown;

export declare class Response<PlatformHeaders extends Headers = Headers, PlatformResponseBody = ReadableStream | null> {
  // constructor (body?: BodyInit, init?: ResponseInit);

  readonly headers: PlatformHeaders;
  readonly ok: boolean;
  readonly status: number;
  readonly statusText: string;
  readonly type: ResponseType;
  readonly url: string;
  readonly redirected: boolean;

  readonly body?: PlatformResponseBody;
  readonly bodyUsed: boolean;

  readonly arrayBuffer: () => Promise<ArrayBuffer>;
  readonly blob: () => Promise<Blob>;
  readonly formData: () => Promise<FormData>;
  readonly json: () => Promise<unknown>;
  readonly text: () => Promise<string>;

  readonly clone: () => this;

  /*
  // Not all our supported runtimes implement these statics
  // see https://developer.mozilla.org/en-US/docs/Web/API/Response

  static error(): Response;
  static json(data: any, init?: ResponseInit): Response;
  static redirect(url: string | URL, status: ResponseRedirectStatus): Response;
  */
}

/**
 * Minimal types for a ReadableStream.
 * @todo Missing declarations for `constructor`, `pipeThrough`, `pipeTo` and `tee`.
 */

export type ReadableStream<T = unknown> = {
  /**
   * Creates a reader and locks the stream to it.
   * While the stream is locked, no other reader can be acquired until this one is released.
   * @see https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream/getReader
   */
  getReader(): ReadableStreamDefaultReader<T>;
  getReader(options: { mode: "byob" }): unknown;

  /**
   * Cancel is used when you've completely finished with the stream and don't need any more data from it, even if there are chunks enqueued waiting to be read.
   * @return a Promise that resolves when the stream is canceled.
   * @see https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream/cancel
   */
  cancel: (reason?: string) => Promise<void>;
}; // & AsyncIterable<T>;
// Should be [AsyncIterable](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream#async_iteration), but not all our supported runtimes implement this.

export type ReadableStreamReadDoneResult = {
  done: true;
  // TODO: Make this `value: undefined` when https://github.com/microsoft/TypeScript-DOM-lib-generator/pull/1676 is merged and released
  value?: unknown;
};

export type ReadableStreamReadValueResult<T> = {
  done: false;
  value: T;
};

export type ReadableStreamReadResult<TValue = unknown> =
  | ReadableStreamReadValueResult<TValue>
  | ReadableStreamReadDoneResult;

export type ReadableStreamDefaultReader<T = unknown> = {
  /**
   * a Promise that fulfills when the stream closes, or rejects if the stream throws an error or the reader's lock is released.
   */
  closed: Promise<void>;
  /**
   * Cancel is used when you've completely finished with the stream and don't need any more data from it, even if there are chunks enqueued waiting to be read.
   * @param reason A human-readable reason for the cancellation.
   * @returns a Promise that resolves when the stream is canceled. Calling this method signals a loss of interest in the stream by a consumer.
   * @see https://developer.mozilla.org/en-US/docs/Web/API/ReadableStreamDefaultReader/cancel
   */
  cancel(reason?: string): Promise<unknown>; // TODO: Should have returned Promise<string | undefined, but node types conflict
  /**
   * @returns a Promise providing access to the next chunk in the stream's internal queue.
   * @see https://developer.mozilla.org/en-US/docs/Web/API/ReadableStreamDefaultReader/read
   */
  read(): Promise<ReadableStreamReadResult<T>>;
  /**
   * Releases the reader's lock on the stream.
   * @see https://developer.mozilla.org/en-US/docs/Web/API/ReadableStreamDefaultReader/releaseLock
   */
  releaseLock(): void;
};

export declare function fetch<
  PlatformRequestBody = RequestBody,
  PlatformHeaders extends Headers = Headers,
  PlatformAbortSignal extends AbortSignal = AbortSignal,
  PlatformResponseBody = ReadableStream | null,
>(
  input: string,
  init?: RequestInit<PlatformRequestBody, PlatformHeaders, PlatformAbortSignal>,
): Promise<Response<PlatformHeaders, PlatformResponseBody>>;

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
export type AnyFetch = typeof fetch<any, any, any, any>;

export interface RequestInit<
  PlatformRequestBody = RequestBody,
  PlatformHeaders = Headers,
  PlatformAbortSignal = AbortSignal,
> {
  /**
   * The request's body.
   */
  body?: PlatformRequestBody;
  /**
   * A string indicating whether credentials will be sent with the request always, never, or only when sent to a same-origin URL. Sets request's credentials.
   */
  credentials?: RequestCredentials;
  /**
   * The request's headers.
   */
  headers?: PlatformHeaders | Record<string, string>;
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
  mode?: RequestMode;
  /**
   * An AbortSignal to set request's signal.
   */
  signal?: PlatformAbortSignal;
}
