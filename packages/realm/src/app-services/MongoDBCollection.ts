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

import { Long, Timestamp } from "bson";

import { DefaultFunctionsFactory, User, binding, createFactory, toArrayBuffer } from "../internal";

/**
 * A remote MongoDB service enabling access to an Atlas cluster.
 */
export type MongoDB = {
  /**
   * The name of the MongoDB service.
   */
  serviceName: string;
  /**
   * @returns The remote MongoDB database.
   */
  db(databaseName: string): MongoDBDatabase;
};

/**
 * A remote MongoDB database enabling access to collections of objects.
 */
export type MongoDBDatabase = {
  /**
   * The name of the MongoDB database.
   */
  name: string;
  /**
   * @returns The remote MongoDB collection.
   */
  collection<T extends Document>(collectionName: string): MongoDBCollection<T>;
};

/**
 * Options passed when finding a single document
 */
export type FindOneOptions = {
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
export type FindOptions = FindOneOptions & {
  /**
   * The maximum number of documents to return.
   */
  readonly limit?: number;
};

/**
 * Options passed when finding and modifying a single document
 */
export type FindOneAndModifyOptions = FindOneOptions & {
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
export type CountOptions = {
  /**
   * The maximum number of documents to count.
   */
  readonly limit?: number;
};

/**
 * Options passed when updating documents
 */
export type UpdateOptions = {
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
 * A document from a MongoDB collection
 */
export type Document<IdType = unknown> = {
  /**
   * The id of the document.
   */
  _id: IdType;
};

/**
 * A new document with an optional _id defined.
 */
export type NewDocument<T extends Document> = Omit<T, "_id"> & Partial<Pick<T, "_id">>;

/**
 * Result of inserting one document
 */
export type InsertOneResult<IdType> = {
  /**
   * The id of the inserted document
   */
  readonly insertedId: IdType;
};

/**
 * Result of inserting many documents
 */
export type InsertManyResult<IdType> = {
  /**
   * The ids of the inserted documents
   */
  readonly insertedIds: IdType[];
};

/**
 * Result of deleting documents
 */
export type DeleteResult = {
  /**
   * The number of documents that were deleted.
   */
  readonly deletedCount: number;
};

/**
 * Result of updating documents
 */
export type UpdateResult<IdType> = {
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
export type Filter = Record<string, unknown>;

/**
 * An object specifying the update operations to perform when updating a document.
 */
export type Update = Record<string, unknown>;

/**
 * A stage of an aggregation pipeline.
 */
export type AggregatePipelineStage = Record<string, unknown>;

/**
 * An operation performed on a document.
 */
export type OperationType =
  /**
   * A document got inserted into the collection.
   */
  | "insert"
  /**
   * A document got deleted from the collection.
   */
  | "delete"
  /**
   * A document got replaced in the collection.
   */
  | "replace"
  /**
   * A document got updated in the collection.
   */
  | "update"
  /**
   * A collection got dropped from a database.
   */
  | "drop"
  /**
   * A collection got renamed.
   */
  | "rename"
  /**
   * A database got dropped.
   */
  | "dropDatabase"
  /**
   * Invalidate events close the change stream cursor.
   */
  | "invalidate";

/**
 * The namespace of a document.
 */
export type DocumentNamespace = {
  /** The name of the database. */
  db: string;
  /** The name of the collection. */
  coll: string;
};

/**
 * A detailed description of an update performed on a document.
 */
export type UpdateDescription = {
  /** Names of fields that got updated. */
  updatedFields: Record<string, unknown>;
  /** Names of fields that got removed. */
  removedFields: string[];
};

/**
 * Acts as the `resumeToken` for the `resumeAfter` parameter when resuming a change stream.
 */
export type ChangeEventId = unknown;

/**
 * A document that contains the _id of the document created or modified by the insert, replace,
 * delete, update operations (i.e. CRUD operations). For sharded collections, also displays the full
 * shard key for the document. The _id field is not repeated if it is already a part of the shard key.
 */
export type DocumentKey<IdType> = {
  /** The id of the document. */
  _id: IdType;
} & Record<string, unknown>;

/**
 * A base change event containing the properties which apply across operation types.
 */
export type BaseChangeEvent<T extends OperationType> = {
  /** The id of the change event. */
  _id: ChangeEventId;
  /** The type of operation which was performed on the document. */
  operationType: T;
  /** The timestamp from the oplog entry associated with the event. */
  clusterTime: Timestamp;
  /**
   * The transaction number.
   * Only present if the operation is part of a multi-document transaction.
   */
  txnNumber?: Long;
  /**
   * The identifier for the session associated with the transaction.
   * Only present if the operation is part of a multi-document transaction.
   */
  lsid?: Record<string, unknown>;
};

/**
 * A document got inserted into the collection.
 */
export type InsertEvent<T extends Document> = {
  /** The namespace (database and collection) of the document got inserted into. */
  ns: DocumentNamespace;
  /** A document that contains the _id of the inserted document. */
  documentKey: DocumentKey<T["_id"]>;
  /** The new document created by the operation */
  fullDocument: T;
} & BaseChangeEvent<"insert">;

/**
 * A document got updated in the collection.
 */
export type UpdateEvent<T extends Document> = {
  /** The namespace (database and collection) of the updated document. */
  ns: DocumentNamespace;
  /** A document that contains the _id of the updated document. */
  documentKey: DocumentKey<T["_id"]>;
  /** A document describing the fields that were updated or removed. */
  updateDescription: UpdateDescription;
  /**
   * For change streams opened with the `fullDocument: updateLookup` option, this will represent
   * the most current majority-committed version of the document modified by the update operation.
   */
  fullDocument?: T;
} & BaseChangeEvent<"update">;

/**
 * A document got replaced in the collection.
 */
export type ReplaceEvent<T extends Document> = {
  /** The namespace (database and collection) of the document got replaced within. */
  ns: DocumentNamespace;
  /** A document that contains the _id of the replaced document. */
  documentKey: DocumentKey<T["_id"]>;
  /** The document after the insert of the replacement document. */
  fullDocument: T;
} & BaseChangeEvent<"replace">;

/**
 * A document got deleted from the collection.
 */
export type DeleteEvent<T extends Document> = {
  /** The namespace (database and collection) which the document got deleted from. */
  ns: DocumentNamespace;
  /** A document that contains the _id of the deleted document. */
  documentKey: DocumentKey<T["_id"]>;
} & BaseChangeEvent<"delete">;

/**
 * Occurs when a collection is dropped from a database.
 */
export type DropEvent = {
  /** The namespace (database and collection) of the collection that got dropped. */
  ns: DocumentNamespace;
} & BaseChangeEvent<"drop">;

/**
 * Occurs when a collection is renamed.
 */
export type RenameEvent = {
  /** The original namespace (database and collection) that got renamed. */
  ns: DocumentNamespace;
  /** The namespace (database and collection) going forward. */
  to: DocumentNamespace;
} & BaseChangeEvent<"rename">;

/**
 * Occurs when a database is dropped.
 */
export type DropDatabaseEvent = {
  /** The namespace (specifying only the database name) of the database that got dropped. */
  ns: Omit<DocumentNamespace, "coll">;
} & BaseChangeEvent<"dropDatabase">;

/**
 * Invalidate events close the change stream cursor.
 */
export type InvalidateEvent = BaseChangeEvent<"invalidate">;

/**
 * A change event communicated via a MongoDB change stream.
 * @see https://docs.mongodb.com/manual/reference/change-events/
 */
export type ChangeEvent<T extends Document> =
  | InsertEvent<T>
  | UpdateEvent<T>
  | ReplaceEvent<T>
  | DeleteEvent<T>
  | DropEvent
  | RenameEvent
  | DropDatabaseEvent
  | InvalidateEvent;

/**
 * A remote collection of documents in a MongoDB database.
 */
export class MongoDBCollection<T extends Document> {
  private functions: DefaultFunctionsFactory;

  /** @internal */
  constructor(
    /** @internal */ private user: User<unknown, unknown, unknown>,
    public readonly serviceName: string,
    public readonly databaseName: string,
    private readonly collectionName: string,
  ) {
    this.functions = createFactory(user, serviceName);
  }

  /**
   * The name of the collection.
   */
  get name(): string {
    return this.collectionName;
  }

  /**
   * Finds the documents which match the provided query.
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
   * @param filter A filter applied to narrow down the result.
   * @param update The new values for the document.
   * @param options Additional options to apply.
   * @returns The document found before updating it.
   */
  findOneAndUpdate(filter: Filter, update: Update, options: FindOneAndModifyOptions = {}): Promise<T | null> {
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
   * @param filter A filter applied to narrow down the result.
   * @param replacement The new replacing document.
   * @param options Additional options to apply.
   * @returns The document found before replacing it.
   */
  findOneAndReplace(filter: Filter, replacement: unknown, options: FindOneAndModifyOptions = {}): Promise<T | null> {
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
   * @param filter A filter applied to narrow down the result.
   * @param options Additional options to apply.
   * @returns The document found before deleting it.
   */
  findOneAndDelete(filter: Filter = {}, options: FindOneOptions = {}): Promise<T | null> {
    return this.functions.findOneAndDelete({
      database: this.databaseName,
      collection: this.name,
      filter,
      sort: options.sort,
      projection: options.projection,
    }) as Promise<T | null>;
  }

  /**
   * Runs an aggregation framework pipeline against this collection.
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
   *
   * Note: When calling this without a filter, you may receive inaccurate document counts
   * as it returns results based on the collection's metadata, which may result in an
   * approximate count. In particular:
   *  - On a sharded cluster, the resulting count will not correctly filter out
   *    {@link https://www.mongodb.com/docs/manual/reference/glossary/#std-term-orphaned-document orphaned documents}.
   *  - After an unclean shutdown or file copy based initial sync, the count may be incorrect.
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
   * @param documents The array of documents.
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
   * @param filter A filter applied to narrow down the result. If omitted, it defaults
   *  to `{}` which deletes all documents in the collection.
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

  /**
   * Creates an asynchronous change stream to monitor this collection for changes.
   *
   * By default, yields all change events for this collection. You may specify at most one of
   * the `filter` or `ids` options.
   *
   * Important Note: To use this on React Native, you must install:
   *
   * 1. Polyfills for `fetch` and `ReadableStream`: https://www.npmjs.com/package/react-native-polyfill-globals
   * 2. Babel plugin enabling async generator syntax: https://npmjs.com/package/@babel/plugin-proposal-async-generator-functions
   * @param options.filter A filter for which change events you want to watch.
   * @param options.ids A list of document ids for which change events you want to watch.
   * @see https://docs.mongodb.com/manual/reference/change-events/
   */
  watch(): AsyncGenerator<ChangeEvent<T>>;
  watch(options: { ids: T["_id"][]; filter?: never }): AsyncGenerator<ChangeEvent<T>>;
  watch(options: { ids?: never; filter: Filter }): AsyncGenerator<ChangeEvent<T>>;
  async *watch({
    ids,
    filter,
  }: {
    ids?: T["_id"][];
    filter?: Filter;
  } = {}): AsyncGenerator<ChangeEvent<T>> {
    const iterator = await this.user.callFunctionStreaming("watch", this.serviceName, {
      database: this.databaseName,
      collection: this.collectionName,
      ids,
      filter,
    });

    const watchStream = binding.WatchStream.make();
    for await (const chunk of iterator) {
      if (!chunk) continue;
      // TODO: Remove `toArrayBuffer()` once https://jira.mongodb.org/browse/RJS-2124 gets solved
      const buffer = toArrayBuffer(chunk);
      binding.Helpers.feedBuffer(watchStream, buffer);
      while (watchStream.state === binding.WatchStreamState.HaveEvent) {
        yield watchStream.nextEvent() as unknown as ChangeEvent<T>;
      }
      if (watchStream.state === binding.WatchStreamState.HaveError) {
        throw watchStream.error;
      }
    }
  }
}
