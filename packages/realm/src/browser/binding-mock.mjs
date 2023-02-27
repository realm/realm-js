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

// TODO: Delete me and update the path in the replace plugin used on the browser target of the Rollup config.

console.log("Loaded the mocked binding");

export const Int64 = {
  numToInt(value) {
    return BigInt(value);
  },
};
export class IndexSet {}
export const ObjKey = {};
export class Timestamp {}
export class App {
  static getUncachedApp(config) {
    return { config };
  }
}
export class Helpers {
  static makeNetworkTransport() {
    return {};
  }
}
