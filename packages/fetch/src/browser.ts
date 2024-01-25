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
const TypeTest: unknown = {};

TypeTest as ReadableStream satisfies types.ReadableStream;
// To ensure users cannot pass a request body that the platform cannot handle
TypeTest as types.RequestBody satisfies BodyInit;

export const Headers = globalThis.Headers satisfies typeof types.Headers;
export const AbortSignal = globalThis.AbortSignal satisfies typeof types.AbortSignal;
export const AbortController = globalThis.AbortController satisfies typeof types.AbortController<AbortSignal>;
// Binding the function to avoid "Failed to execute 'fetch' on 'Window': Illegal invocation".
export const fetch = globalThis.fetch.bind(globalThis) satisfies typeof types.fetch<
  BodyInit,
  Headers,
  AbortSignal,
  Response["body"]
>;
