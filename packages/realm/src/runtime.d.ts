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

declare type Timer = unknown;

declare function setImmediate<Args extends unknown[]>(callback: (...args: Args) => void, ...args: Args): Timer;
declare function clearImmediate(timer: Timer): void;
declare function setTimeout<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delay?: number,
  ...args: Args
): Timer;
declare function clearTimeout(timer: Timer): void;

declare interface Console {
  log(...args: unknown[]): void;
}

declare const console: Console;

/**
 * We don't wont our cross platform SDK to rely on a Node.js type, so we're declaring it ourselves.
 */
declare module "buffer" {
  type Buffer = Uint8Array;
}
