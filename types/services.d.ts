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

type Binary = import("bson").Binary;
type Long = import("bson").Long;
type Timestamp = import("bson").Timestamp;

declare namespace Realm {
  /**
   * The MongoDB Realm Services bound to an app.
   */
  interface Services {
    /** Get the interface to the remote MongoDB service */
    mongodb(serviceName?: string): Realm.Services.MongoDB;
    /** Get the interface to the HTTP service */
    http(serviceName?: string): Realm.Services.HTTP;
  }

  namespace Services {
    /**
     * The MongoDB service can be used to get database and collection objects for interacting with MongoDB data.
     */
    interface MongoDB {
      /**
       * Get the interface to a remote MongoDB database.
       *
       * @param databaseName The name of the database.
       * @returns The remote MongoDB database.
       */
      db(databaseName: string): MongoDBDatabase;
    }

    /**
     * The MongoDB service can be used to get database and collection objects for interacting with MongoDB data.
     */
    interface MongoDBDatabase {
      /**
       * Get the interface to a remote MongoDB collection.
       *
       * @param name The name of the collection.
       * @returns The remote MongoDB collection.
       */
      collection<T extends Realm.Services.MongoDB.Document = any>(name: string): MongoDB.MongoDBCollection<T>;
    }

    namespace MongoDB {
      /**
       * Options passed when finding a signle document
       */
      interface FindOneOptions {
        /**
         * Limits the fields to return for all matching documents.
         * See [Tutorial: Project Fields to Return from Query](https://docs.mongodb.com/manual/tutorial/project-fields-from-query-results/).
         */
        readonly projection?: Record<string, unknown>;

        /**
         * The order in which to return matching documents.
         */
        readonly sort?: Record<string, unknown>;
      }

      /**
       * Options passed when finding a multiple documents
       */
      interface FindOptions extends FindOneOptions {
        /**
         * The maximum number of documents to return.
         */
        readonly limit?: number;
      }

      /**
       * Options passed when finding and modifying a signle document
       */
      interface FindOneAndModifyOptions extends FindOneOptions {
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
      }

      /**
       * Options passed when counting documents
       */
      interface CountOptions {
        /**
         * The maximum number of documents to count.
         */
        readonly limit?: number;
      }

      /**
       * Options passed when updating documents
       */
      interface UpdateOptions {
        /**
         * When true, creates a new document if no document matches the query.
         */
        readonly upsert?: boolean;
        /**
         * Array Filters
         */
        readonly arrayFilters?: Filter[];
      }

      /**
       * A document from a MongoDB collection
       */
      interface Document<IdType = any> {
        /**
         * The id of the document.
         */
        _id: IdType;
      }

      /**
       * A new document with an optional _id defined.
       */
      type NewDocument<T extends Document> = Omit<T, "_id"> & Partial<Pick<T, "_id">>;

      /**
       * Result of inserting one document
       */
      interface InsertOneResult<IdType> {
        /**
         * The id of the inserted document
         */
        readonly insertedId: IdType;
      }

      /**
       * Result of inserting many documents
       */
      interface InsertManyResult<IdType> {
        /**
         * The ids of the inserted documents
         */
        readonly insertedIds: IdType[];
      }

      /**
       * Result of deleting documents
       */
      interface DeleteResult {
        /**
         * The number of documents that were deleted.
         */
        readonly deletedCount: number;
      }

      /**
       * Result of updating documents
       */
      interface UpdateResult<IdType> {
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
      }

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

      /**
       * An operation performed on a document.
       */
      type OperationType =
        /** A document got inserted into the collection. */
        | "insert"
        /** A document got deleted from the collection. */
        | "delete"
        /** A document got replaced in the collection. */
        | "replace"
        /** A document got updated in the collection. */
        | "update"
        /** Occurs when a collection is dropped from a database. */
        | "drop"
        /** Occurs when a collection is renamed. */
        | "rename"
        /** Occurs when a database is dropped. */
        | "dropDatabase"
        /** Invalidate events close the change stream cursor. */
        | "invalidate";

      /**
       * The namespace of a document.
       */
      type DocumentNamespace = {
        /** The name of the database. */
        db: string;
        // database: string;
        /** The name of the collection. */
        coll: string;
        // collection: string;
      };

      /**
       * A detailed description of an update performed on a document.
       */
      type UpdateDescription = {
        /** Names of fields that got updated. */
        updatedFields: Record<string, any>;
        /** Names of fields that got removed. */
        removedFields: string[];
      };

      /**
       * Acts as the `resumeToken` for the `resumeAfter` parameter when resuming a change stream.
       */
      type ChangeEventId = any;

      /**
       * A document that contains the _id of the document created or modified by the insert, replace, delete, update operations (i.e. CRUD operations). For sharded collections, also displays the full shard key for the document. The _id field is not repeated if it is already a part of the shard key.
       */
      type DocumentKey<IdType> = {
        /** The id of the document. */
        _id: IdType;
      } & Record<string, any>;

      /**
       * A base change event containing the properties which apply across operation types.
       */
      type BaseChangeEvent<T extends OperationType> = {
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
      type InsertEvent<T extends Document> = {
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
      type UpdateEvent<T extends Document> = {
        /** The namespace (database and collection) of the updated document. */
        ns: DocumentNamespace;
        /** A document that contains the _id of the updated document. */
        documentKey: DocumentKey<T["_id"]>;
        /** A document describing the fields that were updated or removed. */
        updateDescription: UpdateDescription;
        /**
         * For change streams opened with the `fullDocument: updateLookup` option, this will represents the most current majority-committed version of the document modified by the update operation.
         */
        fullDocument?: T;
      } & BaseChangeEvent<"update">;

      /**
       * A document got replaced in the collection.
       */
      type ReplaceEvent<T extends Document> = {
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
      type DeleteEvent<T extends Document> = {
        /** The namespace (database and collection) which the document got deleted from. */
        ns: DocumentNamespace;
        /** A document that contains the _id of the deleted document. */
        documentKey: DocumentKey<T["_id"]>;
      } & BaseChangeEvent<"delete">;

      /**
       * Occurs when a collection is dropped from a database.
       */
      type DropEvent = {
        /** The namespace (database and collection) of the collection that got dropped. */
        ns: DocumentNamespace;
      } & BaseChangeEvent<"drop">;

      /**
       * Occurs when a collection is renamed.
       */
      type RenameEvent = {
        /** The original namespace (database and collection) that got renamed. */
        ns: DocumentNamespace;
        /** The namespace (database and collection) going forward. */
        to: DocumentNamespace;
      } & BaseChangeEvent<"rename">;

      /**
       * Occurs when a database is dropped.
       */
      type DropDatabaseEvent = {
        /** The namespace (specifying only the database name) of the database that got dropped. */
        ns: Omit<DocumentNamespace, "coll">;
      } & BaseChangeEvent<"dropDatabase">;

      /**
       * Invalidate events close the change stream cursor.
       */
      type InvalidateEvent = BaseChangeEvent<"invalidate">;

      /**
       * Represents a change event communicated via a MongoDB change stream.
       *
       * @see https://docs.mongodb.com/manual/reference/change-events/
       */
      type ChangeEvent<T extends Document> =
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
      interface MongoDBCollection<T extends Document> {
        /**
         * Finds the documents which match the provided query.
         *
         * @param filter An optional filter applied to narrow down the results.
         * @param options Additional options to apply.
         * @returns The documents.
         */
        find(filter?: Filter, options?: FindOptions): Promise<T[]>;

        /**
         * Finds a document which matches the provided filter.
         *
         * @param filter A filter applied to narrow down the result.
         * @param options Additional options to apply.
         * @returns The document.
         */
        findOne(filter?: Filter, options?: FindOneOptions): Promise<T | null>;

        /**
         * Finds a document which matches the provided query and performs the desired update to individual fields.
         *
         * @param filter A filter applied to narrow down the result.
         * @param update The new values for the document.
         * @param options Additional options to apply.
         * @returns The document found before updating it.
         */
        findOneAndUpdate(filter: Filter, update: Update, options?: FindOneAndModifyOptions): Promise<T | null>;

        /**
         * Finds a document which matches the provided filter and replaces it with a new document.
         *
         * @param filter A filter applied to narrow down the result.
         * @param replacement The new replacing document.
         * @param options Additional options to apply.
         * @returns The document found before replacing it.
         */
        findOneAndReplace(
          filter: Filter,
          replacement: NewDocument<T>,
          options?: FindOneAndModifyOptions,
        ): Promise<T | null>;

        /**
         * Finds a document which matches the provided filter and deletes it
         *
         * @param filter A filter applied to narrow down the result.
         * @param options Additional options to apply.
         * @returns The document found before deleting it.
         */
        findOneAndDelete(filter: Filter, options?: FindOneOptions): Promise<T | null>;

        // TODO: Verify pipeline and return type

        /**
         * Runs an aggregation framework pipeline against this collection.
         *
         * @param pipeline An array of aggregation pipeline stages.
         * @returns The result.
         */
        aggregate(pipeline: AggregatePipelineStage[]): Promise<any>;

        /**
         * Counts the number of documents in this collection matching the provided filter.
         */
        count(filter?: Filter, options?: CountOptions): Promise<number>;

        /**
         * Inserts a single document into the collection.
         * Note: If the document is missing an _id, one will be generated for it by the server.
         *
         * @param document The document.
         * @returns The result.
         */
        insertOne(document: NewDocument<T>): Promise<InsertOneResult<T["_id"]>>;

        /**
         * Inserts an array of documents into the collection.
         * If any values are missing identifiers, they will be generated by the server.
         *
         * @param document The array of documents.
         * @returns The result.
         */
        insertMany(documents: NewDocument<T>[]): Promise<InsertManyResult<T["_id"]>>;

        /**
         * Deletes a single matching document from the collection.
         *
         * @param filter A filter applied to narrow down the result.
         * @returns The result.
         */
        deleteOne(filter: Filter): Promise<DeleteResult>;

        /**
         * Deletes multiple documents.
         *
         * @param filter A filter applied to narrow down the result.
         * @returns The result.
         */
        deleteMany(filter: Filter): Promise<DeleteResult>;

        /**
         * Updates a single document matching the provided filter in this collection.
         *
         * @param filter A filter applied to narrow down the result.
         * @param update The new values for the document.
         * @param options Additional options to apply.
         * @returns The result.
         */
        updateOne(filter: Filter, update: Update, options?: UpdateOptions): Promise<UpdateResult<T["_id"]>>;

        /**
         * Updates multiple documents matching the provided filter in this collection.
         *
         * @param filter A filter applied to narrow down the result.
         * @param update The new values for the documents.
         * @param options Additional options to apply.
         * @returns The result.
         */
        updateMany(filter: Filter, update: Update, options?: UpdateOptions): Promise<UpdateResult<T["_id"]>>;

        /**
         * Creates an asynchronous change stream to monitor this collection for changes.
         *
         * By default, yields all change events for this collection. You may specify at most one of
         * the `filter` or `ids` options.
         *
         * Important Note: To use this on React Native, you must install:
         *
         * 1. Polyfills for `fetch`, `ReadableStream` and `TextDecoder`: https://www.npmjs.com/package/react-native-polyfill-globals
         * 2. Babel plugin enabling async generator syntax: https://npmjs.com/package/@babel/plugin-proposal-async-generator-functions
         *
         * @param options.filter A filter for which change events you are interested in.
         * @param options.ids A list of ids that you are interested in watching.
         * @see https://docs.mongodb.com/manual/reference/change-events/
         */
        watch(options?: unknown): AsyncGenerator<ChangeEvent<T>>;

        /**
         * Creates an asynchronous change stream to monitor this collection for changes.
         *
         * By default, yields all change events for this collection. You may specify at most one of
         * the `filter` or `ids` options.
         *
         * @param options.filter A filter for which change events you are interested in.
         * @param options.ids A list of ids that you are interested in watching.
         * @see https://docs.mongodb.com/manual/reference/change-events/
         */
        watch(options: {
          /** List of ids to watch */
          ids: T["_id"][];
        }): AsyncGenerator<ChangeEvent<T>>;

        /**
         * Creates an asynchronous change stream to monitor this collection for changes.
         *
         * By default, yields all change events for this collection.
         * You may specify at most one of the `filter` or `ids` options.
         *
         * @param options.filter A filter for which change events you are interested in.
         * @param options.ids A list of ids that you are interested in watching.
         * @see https://docs.mongodb.com/manual/reference/change-events/
         */
        watch(options: {
          /** A filter document */
          filter: Filter;
        }): AsyncGenerator<ChangeEvent<T>>;
      }
    }

    /**
     * The Stitch HTTP Service is a generic interface that enables you to communicate with any service that is available over HTTP.
     *
     * @see https://docs.mongodb.com/stitch/services/http/
     */
    interface HTTP {
      /**
       * Sends an HTTP GET request to the specified URL.
       *
       * @param url The URL to send the request to.
       * @param options Options related to the request.
       * @returns The response.
       */
      get(url: string, options?: HTTP.RequestOptions): Promise<HTTP.Response>;

      /**
       * Sends an HTTP POST request to the specified URL.
       *
       * @param url The URL to send the request to.
       * @param options Options related to the request.
       * @returns The response.
       */
      post(url: string, options?: HTTP.RequestOptions): Promise<HTTP.Response>;

      /**
       * Sends an HTTP PUT request to the specified URL.
       *
       * @param url The URL to send the request to.
       * @param options Options related to the request.
       * @returns The response.
       */
      put(url: string, options?: HTTP.RequestOptions): Promise<HTTP.Response>;

      /**
       * Sends an HTTP DELETE request to the specified URL.
       *
       * @param url The URL to send the request to.
       * @param options Options related to the request.
       * @returns The response.
       */
      delete(url: string, options?: HTTP.RequestOptions): Promise<HTTP.Response>;

      /**
       * Sends an HTTP HEAD request to the specified URL.
       *
       * @param url The URL to send the request to.
       * @param options Options related to the request.
       * @returns The response.
       */
      head(url: string, options?: HTTP.RequestOptions): Promise<HTTP.Response>;

      /**
       * Sends an HTTP PATCH request to the specified URL.
       *
       * @param url The URL to send the request to.
       * @param options Options related to the request.
       * @returns The response.
       */
      patch(url: string, options?: HTTP.RequestOptions): Promise<HTTP.Response>;
    }

    namespace HTTP {
      /**
       * Options to use when sending a request.
       */
      interface RequestOptions {
        // TODO: Add a link to its documentation.

        /**
         * A url to request from the service to retrieve the authorization header.
         */
        authUrl?: string;

        // TODO: Determine if headers could map to a single string too
        /**
         * Headers used when sending the request.
         */
        headers?: { [name: string]: string[] };

        /**
         * Cookies used when sending the request.
         */
        cookies?: { [name: string]: string };

        /**
         * String encoded body sent in the request.
         */
        body?: string;

        /**
         * Is the body a stringified JSON object? (application/json)
         */
        encodeBodyAsJSON?: boolean;

        /**
         * Is the body stringified form? (multipart/form-data)
         */
        form?: boolean;

        /**
         * Should redirects be followed?
         */
        followRedirects?: boolean;
      }

      /**
       *
       */
      interface Response {
        /**
         * A text representation of the status.
         */
        status: string;

        /**
         * The nummeric status code.
         */
        statusCode: number;

        /**
         * The length of the content.
         */
        contentLength: number;

        /**
         * The headers of the response.
         */
        headers: { [name: string]: string[] };

        /**
         * A BSON binary representation of the body.
         */
        body: Binary;
      }
    }

    /**
     * Use the Push service to enable sending push messages to this user via Firebase Cloud Messaging (FCM).
     */
    interface Push {
      /**
       * Register this device with the user.
       *
       * @param token A Firebase Cloud Messaging (FCM) token, retrieved via the firebase SDK.
       */
      register(token: string): Promise<void>;

      /**
       * Deregister this device with the user, to disable sending messages to this device.
       */
      deregister(): Promise<void>;
    }
  }
}
