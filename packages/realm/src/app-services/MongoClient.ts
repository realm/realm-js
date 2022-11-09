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

import { Document, EJSON } from "bson";
import { DefaultFunctionsFactory, User, createFactory } from "../internal";

type FindOneOptions = {
  readonly projection?: Record<string, unknown>;
  readonly sort?: Record<string, unknown>;
};

type FindOneAndModifyOptions = FindOneOptions & {
  readonly upsert?: boolean;
  readonly returnNewDocument?: boolean;
};

type FindOptions = FindOneOptions & {
  readonly limit?: number;
};

type CountOptions = {
  readonly limit?: number;
};

type AggregatePipelineStage = Record<string, unknown>;
type Filter = Record<string, unknown>;
type Update = Record<string, unknown>;
type NewDocument<T extends Document> = Omit<T, "_id"> & Partial<Pick<T, "_id">>;
type InsertOneResult<IdType> = {
  readonly insertedId: IdType;
};
type InsertManyResult<IdType> = {
  readonly insertedIds: IdType[];
};
type DeleteResult = {
  readonly deletedCount: number;
};

type UpdateResult<IdType> = {
  readonly matchedCount: number;
  readonly modifiedCount: number;
  readonly upsertedId?: IdType;
};
type UpdateOptions = {
  readonly upsert?: boolean;
  readonly arrayFilters?: Filter[];
};

export class MongoClient<T extends Document> {
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

  find(filter: Filter = {}, options: FindOptions = {}): Promise<T[]> {
    return this.functions.find({
      database: this.databaseName,
      collection: this.collectionName,
      query: filter,
      project: options.projection,
      sort: options.sort,
      limit: options.limit,
    }) as Promise<T[]>;
  }

  findOne(filter: Filter = {}, options: FindOneOptions = {}): Promise<T | null> {
    return this.functions.findOne({
      database: this.databaseName,
      collection: this.collectionName,
      query: filter,
      project: options.projection,
      sort: options.sort,
    }) as Promise<T | null>;
  }

  findOneAndUpdate(filter: Filter = {}, update: Update, options: FindOneAndModifyOptions = {}): Promise<T | null> {
    return this.functions.findOneAndUpdate({
      database: this.databaseName,
      collection: this.collectionName,
      filter,
      update,
      sort: options.sort,
      projection: options.projection,
      upsert: options.upsert,
      returnNewDocument: options.returnNewDocument,
    }) as Promise<T | null>;
  }

  findOneAndReplace(
    filter: Filter = {},
    replacement: unknown,
    options: FindOneAndModifyOptions = {},
  ): Promise<T | null> {
    return this.functions.findOneAndReplace({
      database: this.databaseName,
      collection: this.collectionName,
      filter: filter,
      update: replacement,
      sort: options.sort,
      projection: options.projection,
      upsert: options.upsert,
      returnNewDocument: options.returnNewDocument,
    }) as Promise<T | null>;
  }

  findOneAndDelete(filter: Filter = {}, options: FindOneOptions = {}): Promise<T | null> {
    return this.functions.findOneAndReplace({
      database: this.databaseName,
      collection: this.collectionName,
      filter,
      sort: options.sort,
      projection: options.projection,
    }) as Promise<T | null>;
  }

  aggregate(pipeline: AggregatePipelineStage[]): Promise<unknown> {
    return this.functions.aggregate({
      database: this.databaseName,
      collection: this.collectionName,
      pipeline,
    });
  }

  /** @inheritdoc */
  count(filter: Filter = {}, options: CountOptions = {}): Promise<number> {
    return this.functions.count({
      database: this.databaseName,
      collection: this.collectionName,
      query: filter,
      limit: options.limit,
    }) as Promise<number>;
  }

  /** @inheritdoc */
  insertOne(document: NewDocument<T>): Promise<InsertOneResult<T["_id"]>> {
    return this.functions.insertOne({
      database: this.databaseName,
      collection: this.collectionName,
      document,
    }) as Promise<InsertOneResult<T["_id"]>>;
  }

  /** @inheritdoc */
  insertMany(documents: NewDocument<T>[]): Promise<InsertManyResult<T["_id"]>> {
    return this.functions.insertMany({
      database: this.databaseName,
      collection: this.collectionName,
      documents,
    }) as Promise<InsertManyResult<T["_id"]>>;
  }

  /** @inheritdoc */
  deleteOne(filter: Filter = {}): Promise<DeleteResult> {
    return this.functions.deleteOne({
      database: this.databaseName,
      collection: this.collectionName,
      query: filter,
    }) as Promise<DeleteResult>;
  }

  /** @inheritdoc */
  deleteMany(filter: Filter = {}): Promise<DeleteResult> {
    return this.functions.deleteMany({
      database: this.databaseName,
      collection: this.collectionName,
      query: filter,
    }) as Promise<DeleteResult>;
  }

  /** @inheritdoc */
  updateOne(filter: Filter, update: Update, options: UpdateOptions = {}): Promise<UpdateResult<T["_id"]>> {
    return this.functions.updateOne({
      database: this.databaseName,
      collection: this.collectionName,
      query: filter,
      update,
      upsert: options.upsert,
      arrayFilters: options.arrayFilters,
    }) as Promise<UpdateResult<T["_id"]>>;
  }

  /** @inheritdoc */
  updateMany(filter: Filter, update: Update, options: UpdateOptions = {}): Promise<UpdateResult<T["_id"]>> {
    return this.functions.updateMany({
      database: this.databaseName,
      collection: this.collectionName,
      query: filter,
      update,
      upsert: options.upsert,
      arrayFilters: options.arrayFilters,
    }) as Promise<UpdateResult<T["_id"]>>;
  }
}
