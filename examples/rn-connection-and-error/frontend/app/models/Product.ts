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

import Realm, {BSON, ObjectSchema} from 'realm';

/**
 * Current information and inventory about a type of product in a particular store.
 *
 * @note
 * This is simplified to refer to a complete product (e.g. a complete sandwich,
 * rather than individual pieces such as bread, cheese, lettuce, etc.).
 */
export class Product extends Realm.Object {
  _id!: BSON.ObjectId;
  storeId!: BSON.ObjectId;
  name!: string;
  price!: number;
  numInStock!: number;

  static schema: ObjectSchema = {
    name: 'Product',
    primaryKey: '_id',
    properties: {
      _id: 'objectId',
      storeId: {type: 'objectId', indexed: true},
      name: 'string',
      price: 'double',
      numInStock: 'int',
    },
  };
}
