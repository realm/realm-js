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
 * A movie in MongoDB's Mflix sample dataset.
 *
 * @note Most, but not all, fields of the dataset are defined here.
 * @see https://www.mongodb.com/docs/atlas/sample-data/sample-mflix/#std-label-mflix-movies
 */
export class Movie extends Realm.Object {
  _id!: BSON.ObjectId;
  title!: string;
  plot?: string;
  fullplot?: string;
  genres!: Realm.List<string>;
  runtime?: number;
  cast!: Realm.List<string>;
  poster?: string;
  languages!: Realm.List<string>;
  released?: Date;
  directors!: Realm.List<string>;
  year!: number;
  type!: string;

  static schema: ObjectSchema = {
    // Using same name (lowercase 'movies') as the Mflix sample dataset.
    name: 'movies',
    primaryKey: '_id',
    properties: {
      _id: 'objectId',
      title: {type: 'string', indexed: true},
      plot: 'string?',
      fullplot: 'string?',
      genres: 'string[]',
      runtime: 'int?',
      cast: 'string[]',
      poster: 'string?',
      languages: 'string[]',
      released: 'date?',
      directors: 'string[]',
      year: 'int',
      type: 'string',
    },
  };
}
