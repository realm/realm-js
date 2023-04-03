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

export const flags = {
  /**
   * When enabled, objects can be created by providing an array of values (in the order that they were declared in the object schema) in addition to of an object of property values.
   */
  ALLOW_VALUES_ARRAYS: false,
  /**
   * When enabled, accessing the `Realm` without first importing it from the Realm package, will throw.
   * Helps finding places where the app is depending on the now deprecated way of using the package.
   */
  THROW_ON_GLOBAL_REALM: false,
  /**
   * When enabled, calling `Realm.cleanTestState` will be callable.
   * This is disabled by default, mainly because the data-structures needed to support this, introduce minor memory leaks and are not intended for production use.
   */
  CLEAN_TEST_STATE: false,
};
