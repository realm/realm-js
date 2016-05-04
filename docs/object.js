////////////////////////////////////////////////////////////////////////////
//
// Copyright 2016 Realm Inc.
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

/**
 * Realm objects will automatically inherit from this class unless a {@link Realm~ObjectClass}
 * was specified that does **not** inherit from this class.
 * @memberof Realm
 * @since 0.12.0
 */
class Object {
    /**
     * Checks if this object has not been deleted and is part of a valid Realm.
     * @returns {boolean} indicating if the object can be safely accessed.
     * @since 0.12.0
     */
    isValid() {}
}
