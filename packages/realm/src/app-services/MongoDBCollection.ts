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

import { Document } from "bson";
import { DefaultFunctionsFactory, User, binding, createFactory } from "../internal";

/**
 * Options passed when finding a single document
 */
type FindOneOptions = {
  /**
   * Limits the fields to return for all matching documents.
   * See [Tutorial: Project Fields to Return from Query](https://docs.mongodb.com/manual/tutorial/project-fields-from-query-results/).
   */
  readonly projection?: Record<string, unknown>;

  /**
   * The order in which to return matching documents.
   */
  readonly sort?: Record<string, unknown>;
};

/**
 * Options passed when finding a multiple documents
 */
type FindOptions = FindOneOptions & {
  /**
   * The maximum number of documents to return.
   */
  readonly limit?: number;
};

/**
 * Options passed when finding and modifying a single document
 */
type FindOneAndModifyOptions = FindOneOptions & {
  /**
   * Optional. Default: false.
   * A boolean that, if true, indicates that MongoDB should insert a new document that matches the
   * query filter when the query does not match any existing documents in the collection.
   */
  readonly upsert?: boolean;

  /**
   * Optional. Default: false.
   * A boolean that, if true, indicates that the action should return
   * the document in its updated form instead of its original, pre-update form.
   */
  readonly returnNewDocument?: boolean;
};

/**
 * Options passed when counting documents
 */
type CountOptions = {
  /**
   * The maximum number of documents to count.
   */
  readonly limit?: number;
};

/**
 * Options passed when updating documents
 */
type UpdateOptions = {
  /**
   * When true, creates a new document if no document matches the query.
   */
  readonly upsert?: boolean;
  /**
   * Array Filters
   */
  readonly arrayFilters?: Filter[];
};

/**
 * A new document with an optional _id defined.
 */
type NewDocument<T extends Document> = Omit<T, "_id"> & Partial<Pick<T, "_id">>;

/**
 * Result of inserting one document
 */
type InsertOneResult<IdType> = {
  /**
   * The id of the inserted document
   */
  readonly insertedId: IdType;
};

/**
 * Result of inserting many documents
 */
type InsertManyResult<IdType> = {
  /**
   * The ids of the inserted documents
   */
  readonly insertedIds: IdType[];
};

/**
 * Result of deleting documents
 */
type DeleteResult = {
  /**
   * The number of documents that were deleted.
   */
  readonly deletedCount: number;
};

/**
 * Result of updating documents
 */
type UpdateResult<IdType> = {
  /**
   * The number of documents that matched the filter.
   */
  readonly matchedCount: number;

  /**
   * The number of documents matched by the query.
   */
  readonly modifiedCount: number;

  /**
   * The identifier of the inserted document if an upsert took place.
   *
   * See [[RemoteUpdateOptions.upsert]].
   */
  readonly upsertedId?: IdType;
};

/**
 * A filter applied to limit the documents being queried for.
 */
type Filter = Record<string, unknown>;

/**
 * An object specifying the update operations to perform when updating a document.
 */
type Update = Record<string, unknown>;

/**
 * A stage of an aggregation pipeline.
 */
type AggregatePipelineStage = Record<string, unknown>;

export class MongoDBCollection<T extends Document> {
  /** @internal */
  private user: binding.SyncUser;
  databaseName: string;
  name: string;
  serviceName: string;
  functions: DefaultFunctionsFactory;

  /**
   * Construct a remote collection of documents
   */
  /** @internal */
  constructor(user: binding.SyncUser, serviceName: string, databaseName: string, collectionName: string) {
    this.user = user;
    this.functions = createFactory(User.get(user), serviceName);
    this.databaseName = databaseName;
    this.name = collectionName;
    this.serviceName = serviceName;
  }

  /**
   * Finds the documents which match the provided query.
   *
   * @param filter An optional filter applied to narrow down the results.
   * @param options Additional options to apply.
   * @returns The documents.
   */
  find(filter: Filter = {}, options: FindOptions = {}): Promise<T[]> {
    return this.functions.find({
      database: this.databaseName,
      collection: this.name,
      query: filter,
      project: options.projection,
      sort: options.sort,
      limit: options.limit,
    }) as Promise<T[]>;
  }

  /**
   * Finds a document which matches the provided filter.
   *
   * @param filter A filter applied to narrow down the result.
   * @param options Additional options to apply.
   * @returns The document.
   */
  findOne(filter: Filter = {}, options: FindOneOptions = {}): Promise<T | null> {
    return this.functions.findOne({
      database: this.databaseName,
      collection: this.name,
      query: filter,
      project: options.projection,
      sort: options.sort,
    }) as Promise<T | null>;
  }

  /**
   * Finds a document which matches the provided query and performs the desired update to individual fields.
   *
   * @param filter A filter applied to narrow down the result.
   * @param update The new values for the document.
   * @param options Additional options to apply.
   * @returns The document found before updating it.
   */
  findOneAndUpdate(filter: Filter = {}, update: Update, options: FindOneAndModifyOptions = {}): Promise<T | null> {
    return this.functions.findOneAndUpdate({
      database: this.databaseName,
      collection: this.name,
      filter,
      update,
      sort: options.sort,
      projection: options.projection,
      upsert: options.upsert,
      returnNewDocument: options.returnNewDocument,
    }) as Promise<T | null>;
  }

  /**
   * Finds a document which matches the provided filter and replaces it with a new document.
   *
   * @param filter A filter applied to narrow down the result.
   * @param replacement The new replacing document.
   * @param options Additional options to apply.
   * @returns The document found before replacing it.
   */
  findOneAndReplace(
    filter: Filter = {},
    replacement: unknown,
    options: FindOneAndModifyOptions = {},
  ): Promise<T | null> {
    return this.functions.findOneAndReplace({
      database: this.databaseName,
      collection: this.name,
      filter: filter,
      update: replacement,
      sort: options.sort,
      projection: options.projection,
      upsert: options.upsert,
      returnNewDocument: options.returnNewDocument,
    }) as Promise<T | null>;
  }

  /**
   * Finds a document which matches the provided filter and deletes it
   *
   * @param filter A filter applied to narrow down the result.
   * @param options Additional options to apply.
   * @returns The document found before deleting it.
   */
  findOneAndDelete(filter: Filter = {}, options: FindOneOptions = {}): Promise<T | null> {
    return this.functions.findOneAndReplace({
      database: this.databaseName,
      collection: this.name,
      filter,
      sort: options.sort,
      projection: options.projection,
    }) as Promise<T | null>;
  }

  /**
   * Runs an aggregation framework pipeline against this collection.
   *
   * @param pipeline An array of aggregation pipeline stages.
   * @returns The result.
   */
  aggregate(pipeline: AggregatePipelineStage[]): Promise<unknown> {
    return this.functions.aggregate({
      database: this.databaseName,
      collection: this.name,
      pipeline,
    });
  }

  /**
   * Counts the number of documents in this collection matching the provided filter.
   */
  count(filter: Filter = {}, options: CountOptions = {}): Promise<number> {
    return this.functions.count({
      database: this.databaseName,
      collection: this.name,
      query: filter,
      limit: options.limit,
    }) as Promise<number>;
  }

  /**
   * Inserts a single document into the collection.
   * Note: If the document is missing an _id, one will be generated for it by the server.
   *
   * @param document The document.
   * @returns The result.
   */
  insertOne(document: NewDocument<T>): Promise<InsertOneResult<T["_id"]>> {
    return this.functions.insertOne({
      database: this.databaseName,
      collection: this.name,
      document,
    }) as Promise<InsertOneResult<T["_id"]>>;
  }

  /**
   * Inserts an array of documents into the collection.
   * If any values are missing identifiers, they will be generated by the server.
   *
   * @param document The array of documents.
   * @returns The result.
   */
  insertMany(documents: NewDocument<T>[]): Promise<InsertManyResult<T["_id"]>> {
    return this.functions.insertMany({
      database: this.databaseName,
      collection: this.name,
      documents,
    }) as Promise<InsertManyResult<T["_id"]>>;
  }

  /**
   * Deletes a single matching document from the collection.
   *
   * @param filter A filter applied to narrow down the result.
   * @returns The result.
   */
  deleteOne(filter: Filter = {}): Promise<DeleteResult> {
    return this.functions.deleteOne({
      database: this.databaseName,
      collection: this.name,
      query: filter,
    }) as Promise<DeleteResult>;
  }

  /**
   * Deletes multiple documents.
   *
   * @param filter A filter applied to narrow down the result.
   * @returns The result.
   */
  deleteMany(filter: Filter = {}): Promise<DeleteResult> {
    return this.functions.deleteMany({
      database: this.databaseName,
      collection: this.name,
      query: filter,
    }) as Promise<DeleteResult>;
  }

  /**
   * Updates a single document matching the provided filter in this collection.
   *
   * @param filter A filter applied to narrow down the result.
   * @param update The new values for the document.
   * @param options Additional options to apply.
   * @returns The result.
   */
  updateOne(filter: Filter, update: Update, options: UpdateOptions = {}): Promise<UpdateResult<T["_id"]>> {
    return this.functions.updateOne({
      database: this.databaseName,
      collection: this.name,
      query: filter,
      update,
      upsert: options.upsert,
      arrayFilters: options.arrayFilters,
    }) as Promise<UpdateResult<T["_id"]>>;
  }

  /**
   * Updates multiple documents matching the provided filter in this collection.
   *
   * @param filter A filter applied to narrow down the result.
   * @param update The new values for the documents.
   * @param options Additional options to apply.
   * @returns The result.
   */
  updateMany(filter: Filter, update: Update, options: UpdateOptions = {}): Promise<UpdateResult<T["_id"]>> {
    return this.functions.updateMany({
      database: this.databaseName,
      collection: this.name,
      query: filter,
      update,
      upsert: options.upsert,
      arrayFilters: options.arrayFilters,
    }) as Promise<UpdateResult<T["_id"]>>;
  }
}
