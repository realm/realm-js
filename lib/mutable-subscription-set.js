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

const { symbols } = require("@realm/common");

// React Native `Proxy` objects when not using JSI are not compatible with
// `JSValueIsObjectOfClass`, because it seems JSC is not able to "unwrap"
// the proxy - see https://github.com/realm/realm-js/issues/4507#issuecomment-1112237740.
//
// In order to enable the return value of Realm React's `useQuery` (which are wrapped
// in a proxy) to be passed to the subscription mutation methods, we need to store
// the unproxied results on the proxy object as a non-enumerable field with a symbol key
// (see `useQuery.ts` in @realm/react), then in here, we check if that field exists, and
// if so we pass the original unproxied results to C++.
//
// Once our v11 branch is merged, we can revert this change as JSI React Native `Proxy`s
// work fine, by reverting PR #4541.
const instanceMethods = {
  add(query, options) {
    return this._add(query[symbols.PROXY_TARGET] || query, options);
  },

  remove(query) {
    return this._remove(query[symbols.PROXY_TARGET] || query);
  },
};

const staticMethods = {
  // none
};

module.exports = {
  static: staticMethods,
  instance: instanceMethods,
};
