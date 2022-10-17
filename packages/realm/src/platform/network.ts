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

import { binding } from "../internal";

export type Request = binding.Request_Relaxed;
export type Response = binding.Response;

type NetworkType = {
  fetch(request: Request): Promise<Response>;
};

export const network: NetworkType = {
  fetch() {
    throw new Error("Not supported on this platform");
  },
};

export function inject(injected: NetworkType) {
  Object.freeze(Object.assign(network, injected));
}
