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

import Realm, {BSON} from 'realm';

/**
 * The `Task` data model.
 *
 * @note
 * This app uses the `@realm/babel-plugin` plugin, thus we can define a Realm
 * Object by simply defining the properties on the class with the correct types
 * and have the plugin convert it to a correct Realm schema automatically.
 * If you are not using the plugin, you need to define a `static schema: ObjectSchema`
 * on this class in addition to the already defined properties.
 *
 * @see
 * - Define a model: {@link https://www.mongodb.com/docs/realm/sdk/react-native/model-data/define-a-realm-object-model/}
 * - Babel plugin: {@link https://www.npmjs.com/package/@realm/babel-plugin}
 */
export class Task extends Realm.Object {
  _id: BSON.ObjectId = new BSON.ObjectId();
  description!: string;
  isComplete: boolean = false;
  createdAt: Date = new Date();
  userId!: string;

  static primaryKey = '_id';
}
