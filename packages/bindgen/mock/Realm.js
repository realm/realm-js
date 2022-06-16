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

// TODO: Delete this once the C++ binding generates these values

import { PropertyType } from "./PropertyType.js";

export class Realm {
  static getSharedRealm() {
    return new Realm();
  }

  get schema() {
    return [
      {
        name: "Person",
        persistedProperties: [{ name: "name", type: PropertyType.String, columnKey: { value: 0 } }],
      },
    ];
  }
}
