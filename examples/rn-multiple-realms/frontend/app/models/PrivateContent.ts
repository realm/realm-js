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

import {Movie} from './Movie';

/**
 * The private content of a user who has logged in using email and password
 * rather than via a public/anonymous login. This content includes movies
 * saved to `My List` which can be synced to Atlas and other devices.
 */
export class PrivateContent extends Realm.Object {
  _id!: BSON.ObjectId;
  /** The Atlas App user ID (i.e. `app.currentUser.id`). */
  userId!: string;
  myList!: Realm.List<Movie>;

  static schema: ObjectSchema = {
    name: 'PrivateContent',
    primaryKey: '_id',
    properties: {
      _id: 'objectId',
      userId: 'string',
      // Make sure to use lowercase `movies` as defined in `Movie.schema.name`.
      myList: 'movies[]',
    },
  };
}
