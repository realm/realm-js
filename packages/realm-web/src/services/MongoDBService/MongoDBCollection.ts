////////////////////////////////////////////////////////////////////////////
//
// Copyright 2020 Realm Inc.
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

import { Fetcher } from "../../Fetcher";
import { FunctionsFactory } from "../../FunctionsFactory";

import { WatchStream, WatchStreamState } from "./WatchStream";

type Document = Realm.Services.MongoDB.Document;
type NewDocument<T extends Document> = Realm.Services.MongoDB.NewDocument<T>;
type ChangeEvent<T extends Document> = Realm.Services.MongoDB.ChangeEvent<T>;
type InsertOneResult<IdType> = Realm.Services.MongoDB.InsertOneResult<IdType>;
type InsertManyResult<IdType> = Realm.Services.MongoDB.InsertManyResult<IdType>;
type DeleteResult = Realm.Services.MongoDB.DeleteResult;
type UpdateResult<IdType> = Realm.Services.MongoDB.UpdateResult<IdType>;

/**
 * A remote collection of documents.
 */
export class MongoDBCollection<T extends Document> implements Realm.Services.MongoDB.MongoDBCollection<T> {
  /**
   * The function factory to use when sending requests to the service.
   */
  private functions: Realm.DefaultFunctionsFactory;

  /**
   * The name of the database.
   */
  private readonly databaseName: string;

  /**
   * The name of the collection.
   */
  private readonly collectionName: string;

  private readonly serviceName: string;
  private readonly fetcher: Fetcher;

  /**
   * Construct a remote collection of documents.
   * @param fetcher The fetcher to use when requesting the service.
   * @param serviceName The name of the remote service.
   * @param databaseName The name of the database.
   * @param collectionName The name of the remote collection.
   */
  constructor(fetcher: Fetcher, serviceName: string, databaseName: string, collectionName: string) {
    this.functions = FunctionsFactory.create(fetcher, {
      serviceName,
    });
    this.databaseName = databaseName;
    this.collectionName = collectionName;
    this.serviceName = serviceName;
    this.fetcher = fetcher;
  }

  /** @inheritdoc */
  find(filter: Realm.Services.MongoDB.Filter = {}, options: Realm.Services.MongoDB.FindOptions = {}): Promise<T[]> {
    return this.functions.find({
      database: this.databaseName,
      collection: this.collectionName,
      query: filter,
      project: options.projection,
      sort: options.sort,
      limit: options.limit,
    });
  }

  /** @inheritdoc */
  findOne(
    filter: Realm.Services.MongoDB.Filter = {},
    options: Realm.Services.MongoDB.FindOneOptions = {},
  ): Promise<T | null> {
    return this.functions.findOne({
      database: this.databaseName,
      collection: this.collectionName,
      query: filter,
      project: options.projection,
      sort: options.sort,
    });
  }

  /** @inheritdoc */
  findOneAndUpdate(
    filter: Realm.Services.MongoDB.Filter = {},
    update: Realm.Services.MongoDB.Update,
    options: Realm.Services.MongoDB.FindOneAndModifyOptions = {},
  ): Promise<T | null> {
    return this.functions.findOneAndUpdate({
      database: this.databaseName,
      collection: this.collectionName,
      filter,
      update,
      sort: options.sort,
      projection: options.projection,
      upsert: options.upsert,
      returnNewDocument: options.returnNewDocument,
    });
  }

  /** @inheritdoc */
  findOneAndReplace(
    filter: Realm.Services.MongoDB.Filter = {},
    replacement: NewDocument<T>,
    options: Realm.Services.MongoDB.FindOneAndModifyOptions = {},
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
    });
  }

  /** @inheritdoc */
  findOneAndDelete(
    filter: Realm.Services.MongoDB.Filter = {},
    options: Realm.Services.MongoDB.FindOneOptions = {},
  ): Promise<T | null> {
    return this.functions.findOneAndReplace({
      database: this.databaseName,
      collection: this.collectionName,
      filter,
      sort: options.sort,
      projection: options.projection,
    });
  }

  /** @inheritdoc */
  aggregate(pipeline: Realm.Services.MongoDB.AggregatePipelineStage[]): Promise<unknown> {
    return this.functions.aggregate({
      database: this.databaseName,
      collection: this.collectionName,
      pipeline,
    });
  }

  /** @inheritdoc */
  count(
    filter: Realm.Services.MongoDB.Filter = {},
    options: Realm.Services.MongoDB.CountOptions = {},
  ): Promise<number> {
    return this.functions.count({
      database: this.databaseName,
      collection: this.collectionName,
      query: filter,
      limit: options.limit,
    });
  }

  /** @inheritdoc */
  insertOne(document: NewDocument<T>): Promise<InsertOneResult<T["_id"]>> {
    return this.functions.insertOne({
      database: this.databaseName,
      collection: this.collectionName,
      document,
    });
  }

  /** @inheritdoc */
  insertMany(documents: NewDocument<T>[]): Promise<InsertManyResult<T["_id"]>> {
    return this.functions.insertMany({
      database: this.databaseName,
      collection: this.collectionName,
      documents,
    });
  }

  /** @inheritdoc */
  deleteOne(filter: Realm.Services.MongoDB.Filter = {}): Promise<DeleteResult> {
    return this.functions.deleteOne({
      database: this.databaseName,
      collection: this.collectionName,
      query: filter,
    });
  }

  /** @inheritdoc */
  deleteMany(filter: Realm.Services.MongoDB.Filter = {}): Promise<DeleteResult> {
    return this.functions.deleteMany({
      database: this.databaseName,
      collection: this.collectionName,
      query: filter,
    });
  }

  /** @inheritdoc */
  updateOne(
    filter: Realm.Services.MongoDB.Filter,
    update: Realm.Services.MongoDB.Update,
    options: Realm.Services.MongoDB.UpdateOptions = {},
  ): Promise<UpdateResult<T["_id"]>> {
    return this.functions.updateOne({
      database: this.databaseName,
      collection: this.collectionName,
      query: filter,
      update,
      upsert: options.upsert,
      arrayFilters: options.arrayFilters,
    });
  }

  /** @inheritdoc */
  updateMany(
    filter: Realm.Services.MongoDB.Filter,
    update: Realm.Services.MongoDB.Update,
    options: Realm.Services.MongoDB.UpdateOptions = {},
  ): Promise<UpdateResult<T["_id"]>> {
    return this.functions.updateMany({
      database: this.databaseName,
      collection: this.collectionName,
      query: filter,
      update,
      upsert: options.upsert,
      arrayFilters: options.arrayFilters,
    });
  }

  watch(options: {
    /** List of ids to watch */
    ids: T["_id"][];
    filter: never;
  }): AsyncGenerator<ChangeEvent<T>>;
  watch(options: {
    ids: never;
    /** A filter document */
    filter: Realm.Services.MongoDB.Filter;
  }): AsyncGenerator<ChangeEvent<T>>;
  watch({
    ids,
    filter,
  }: {
    ids?: T["_id"][];
    filter?: Realm.Services.MongoDB.Filter;
  } = {}): AsyncGenerator<ChangeEvent<T>> {
    const iterable = this.functions.callFunctionStreaming("watch", {
      database: this.databaseName,
      collection: this.collectionName,
      ids,
      filter,
    });
    // Unpack the async iterable, making it possible for us to propagate the `return` when this generator is returning
    const iterator = iterable.then((i) => i[Symbol.asyncIterator]());
    const stream = this.watchImpl(iterator);
    // Store the original return on the stream, to enable propagating to the original implementation after we've returned on the iterator
    const originalReturn = stream.return;
    return Object.assign(stream, {
      return(value: unknown) {
        iterator.then((i) => (i.return ? i.return(value) : undefined));
        return originalReturn.call(stream, value);
      },
    });
  }

  /**
   * @param iterator An async iterator of the response body of a watch request.
   * @yields Change events.
   * Note: We had to split this from the `watch` method above to enable manually calling `return` on the response body iterator.
   */
  async *watchImpl(iterator: Promise<AsyncIterator<Uint8Array>>): AsyncGenerator<ChangeEvent<T>> {
    const watchStream = new WatchStream<T>();
    // Repack the iterator into an interable for the `watchImpl` to consume
    const iterable = iterator.then((i) => ({ [Symbol.asyncIterator]: () => i }));
    // Start consuming change events
    for await (const chunk of await iterable) {
      if (!chunk) continue;
      watchStream.feedBuffer(chunk);
      while (watchStream.state == WatchStreamState.HAVE_EVENT) {
        yield watchStream.nextEvent() as ChangeEvent<T>;
      }
      if (watchStream.state == WatchStreamState.HAVE_ERROR)
        // XXX this is just throwing an error like {error_code: "BadRequest, error: "message"},
        // which matches realm-js, but is different from how errors are handled in realm-web
        throw watchStream.error;
    }
  }
}
