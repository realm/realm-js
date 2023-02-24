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

// Exports a globalThis which is polyfilled for iOS 11/12
// From https://github.com/zloirock/core-js/blob/v3.27.2/packages/core-js/internals/global.js

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const check = function (it: any) {
  return it && it.Math === Math && it;
};

/** @internal */
// eslint-disable-next-line no-restricted-globals
export const safeGlobalThis: typeof globalThis & Record<string, unknown> =
  // eslint-disable-next-line no-restricted-globals
  check(typeof globalThis === "object" && globalThis) ||
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore We're relying on an identifier that might not be there
  check(typeof window === "object" && window) ||
  // eslint-disable-next-line no-restricted-globals -- safe
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore allow `self`
  check(typeof self === "object" && self) ||
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore allow `global`
  check(typeof global === "object" && global) ||
  // eslint-disable-next-line no-new-func -- fallback
  (function () {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore allow `this`
    return this;
  })() ||
  Function("return this")();
