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

export const fetch = globalThis.fetch satisfies typeof types.fetch<BodyInit_, AbortSignal>;

class PolyfilledAbortSignal extends AbortSignal {
  static timeout(): PolyfilledAbortSignal {
    throw new Error("Not yet implemented");
  }
}
PolyfilledAbortSignal satisfies typeof types.AbortSignal;
export { PolyfilledAbortSignal as AbortSignal };

const ReactNativeAbortController = AbortController satisfies typeof types.AbortController<AbortSignal>;
export { ReactNativeAbortController as AbortController };
