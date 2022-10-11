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

declare namespace Realm {
  /**
   * Specify that the decorated field should be indexed by Realm.
   * See: [documentation](https://www.mongodb.com/docs/realm/sdk/react-native/examples/define-a-realm-object-model/#index-a-property)
   */
  const index: (target: unknown, memberName: string) => void;

  /**
   * Specify that the decorated field should be remapped to a different property name in the Realm database.
   * See: [documentation](https://www.mongodb.com/docs/realm/sdk/react-native/examples/define-a-realm-object-model/#remap-a-property)
   *
   * @param realmPropertyName The name of the property in the Realm database
   */
  const mapTo: (realmPropertyName: string) => (target: unknown, memberName: string) => void;
}
