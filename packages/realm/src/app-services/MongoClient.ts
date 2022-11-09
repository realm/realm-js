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

import { EJSON } from "bson";
import { User, createFactory, DefaultFunctionsFactory } from "../internal";
export type Filter {}
export class MongoClient {
  databaseName: string;
  collectionName: string;
  user: User;
  serviceName: string;
  functions: DefaultFunctionsFactory;

  /**
   * Construct a remote collection of documents
   */
  constructor(user: User, serviceName: string, databaseName: string, collectionName: string) {
    this.user = user;
    this.functions = createFactory(user, serviceName);
    this.databaseName = databaseName;
    this.collectionName = collectionName;
    this.serviceName = serviceName;
  }

  /** @inheritdoc */
  find(filter: unknown = {}, options: unknown = {}): Promise<unknown> {
    return this.functions.find({
      database: this.databaseName,
      collection: this.collectionName,
      query: filter,
      project: options.projection,
      sort: options.sort,
      limit: options.limit,
    });
  }
}
