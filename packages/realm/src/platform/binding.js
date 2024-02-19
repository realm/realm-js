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

import { applyPatch } from "./binding-patch";

let injected = null;

export const binding = new Proxy(
  {},
  {
    get(_, prop, receiver) {
      if (injected) {
        return Reflect.get(injected, prop, receiver);
      } else {
        throw new Error(`Getting '${prop}' from binding before it was injected`);
      }
    },
    set(_, prop, value) {
      if (injected) {
        return Reflect.set(injected, prop, value, injected);
      } else {
        throw new Error(`Setting '${prop}' on binding before it was injected`);
      }
    },
  },
);

export function inject(value) {
  injected = value;
  applyPatch(injected);
}
