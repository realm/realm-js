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

import {Product} from './Product';

/**
 * A kiosk belonging to a particular store. Each kiosk stores a list
 * of products available in the current store.
 */
export class Kiosk extends Realm.Object {
  _id!: BSON.ObjectId;
  storeId!: BSON.ObjectId;
  products!: Realm.List<Product>;

  static schema: ObjectSchema = {
    name: 'Kiosk',
    primaryKey: '_id',
    properties: {
      _id: 'objectId',
      storeId: {type: 'objectId', indexed: true},
      products: 'Product[]',
    },
  };
}
