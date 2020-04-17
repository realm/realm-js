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

// See https://stackoverflow.com/a/51114250 on why we're importing the BSON types like this
type ObjectID = import("bson").ObjectID;
type Binary = import("bson").Binary;

declare namespace Realm {
    /**
     * The MongoDB Realm Services bound to an app.
     */
    interface Services {
        /** Get the interface to the remote MongoDB service */
        mongodb(serviceName?: string): Realm.Services.RemoteMongoDB;
        /** Get the interface to the HTTP service */
        http(serviceName?: string): Realm.Services.HTTP;
    }

    namespace Services {
        /**
         * The RemoteMongoDB service can be used to get database and collection objects for interacting with MongoDB data.
         */
        interface RemoteMongoDB {
            /**
             * Get the interface to a remote MongoDB database.
             *
             * @param databaseName The name of the database.
             * @returns The remote MongoDB database.
             */
            db(databaseName: string): RemoteMongoDBDatabase;
        }

        /**
         * The RemoteMongoDB service can be used to get database and collection objects for interacting with MongoDB data.
         */
        interface RemoteMongoDBDatabase {
            /**
             * Get the interface to a remote MongoDB collection.
             *
             * @param collectionName The name of the collection.
             * @returns The remote MongoDB collection.
             */
            collection<T extends Realm.Services.RemoteMongoDB.Document = any>(
                collectionName: string,
            ): RemoteMongoDB.RemoteMongoDBCollection<T>;
        }

        namespace RemoteMongoDB {
            /**
             * Options passed when finding a signle document
             */
            interface FindOneOptions {
                /**
                 * Limits the fields to return for all matching documents.
                 * See [Tutorial: Project Fields to Return from Query](https://docs.mongodb.com/manual/tutorial/project-fields-from-query-results/).
                 */
                readonly projection?: object;

                /**
                 * The order in which to return matching documents.
                 */
                readonly sort?: object;
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

                /**
                 *
                 */
                readonly upsert?: boolean;
            }

            /**
             * A document from a MongoDB collection
             */
            interface Document {
                /**
                 * An ID automatically generated by the server.
                 */
                _id: ObjectID;
            }

            /**
             * A new document with an optional _id defined.
             */
            type NewDocument<T extends Document> = Omit<T, "_id"> & {
                /**
                 *
                 */
                _id?: ObjectID;
            };

            /**
             * Options passed when inserting a document
             */
            interface InsertOneResult {
                /**
                 * The id of the inserted document
                 */
                readonly insertedId: ObjectID;
            }

            /**
             * Options passed when inserting multiple documents
             */
            interface InsertManyResult {
                /**
                 * The ids of the inserted documents
                 */
                readonly insertedIds: ObjectID[];
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
            interface UpdateResult {
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
                readonly upsertedId: any;
            }

            /**
             * A filter applied to limit the documents being queried for
             */
            type Filter = object;

            /**
             * A remote collection of documents in a MongoDB database.
             */
            interface RemoteMongoDBCollection<T extends Document> {
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
                findOne(
                    filter?: Filter,
                    options?: FindOneOptions,
                ): Promise<T | null>;

                /**
                 * Finds a document which matches the provided query and performs the desired update to individual fields.
                 *
                 * @param filter A filter applied to narrow down the result.
                 * @param update The new values for the document.
                 * @param options Additional options to apply.
                 * @returns The document found before updating it.
                 */
                findOneAndUpdate(
                    filter: Filter,
                    update: Partial<NewDocument<T>>,
                    options?: FindOneAndModifyOptions,
                ): Promise<T | null>;

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
                findOneAndDelete(
                    filter: Filter,
                    options?: FindOneOptions,
                ): Promise<T | null>;

                /**
                 * Runs an aggregation framework pipeline against this collection.
                 * // TODO: Verify pipeline and return type
                 *
                 * @param pipeline An array of aggregation pipeline stages.
                 * @returns The result.
                 */
                aggregate(pipeline: object[]): Promise<any>;

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
                insertOne(document: NewDocument<T>): Promise<InsertOneResult>;

                /**
                 * Inserts an array of documents into the collection.
                 * If any values are missing identifiers, they will be generated by the server.
                 *
                 * @param document The array of documents.
                 * @returns The result.
                 */
                insertMany(
                    documents: NewDocument<T>[],
                ): Promise<InsertManyResult>;

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
                updateOne(
                    filter: Filter,
                    update: Partial<NewDocument<T>>,
                    options?: UpdateOptions,
                ): Promise<UpdateResult>;

                /**
                 * Updates multiple documents matching the provided filter in this collection.
                 *
                 * @param filter A filter applied to narrow down the result.
                 * @param update The new values for the documents.
                 * @param options Additional options to apply.
                 * @returns The result.
                 */
                updateMany(
                    filter: Filter,
                    update: Partial<NewDocument<T>>,
                    options?: UpdateOptions,
                ): Promise<UpdateResult>;

                /*
                watch(
                    arg?: any[] | object | undefined
                ): Promise<Stream<ChangeEvent<T>>>;

                watchCompact(
                    ids: any[]
                ): Promise<Stream<CompactChangeEvent<T>>>;
                */
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
            get(
                url: string,
                options: HTTP.RequestOptions,
            ): Promise<HTTP.Response>;

            /**
             * Sends an HTTP POST request to the specified URL.
             *
             * @param url The URL to send the request to.
             * @param options Options related to the request.
             * @returns The response.
             */
            post(
                url: string,
                options: HTTP.RequestOptions,
            ): Promise<HTTP.Response>;

            /**
             * Sends an HTTP PUT request to the specified URL.
             *
             * @param url The URL to send the request to.
             * @param options Options related to the request.
             * @returns The response.
             */
            put(
                url: string,
                options: HTTP.RequestOptions,
            ): Promise<HTTP.Response>;

            /**
             * Sends an HTTP DELETE request to the specified URL.
             *
             * @param url The URL to send the request to.
             * @param options Options related to the request.
             * @returns The response.
             */
            delete(
                url: string,
                options: HTTP.RequestOptions,
            ): Promise<HTTP.Response>;

            /**
             * Sends an HTTP HEAD request to the specified URL.
             *
             * @param url The URL to send the request to.
             * @param options Options related to the request.
             * @returns The response.
             */
            head(
                url: string,
                options: HTTP.RequestOptions,
            ): Promise<HTTP.Response>;

            /**
             * Sends an HTTP PATCH request to the specified URL.
             *
             * @param url The URL to send the request to.
             * @param options Options related to the request.
             * @returns The response.
             */
            patch(
                url: string,
                options: HTTP.RequestOptions,
            ): Promise<HTTP.Response>;
        }

        namespace HTTP {
            /**
             *
             */
            interface RequestOptions {
                /**
                 *
                 */
                authUrl?: string;
                // TODO: Determine if headers could map to a single string too
                /**
                 *
                 */
                headers?: { [name: string]: string[] };
                /**
                 *
                 */
                cookies?: { [name: string]: string };
                /**
                 *
                 */
                body?: string;
                /**
                 *
                 */
                encodeBodyAsJSON?: boolean;
                /**
                 *
                 */
                form?: boolean;
                /**
                 *
                 */
                followRedirects?: boolean;
            }

            /**
             *
             */
            interface Response {
                /**
                 *
                 */
                status: string;
                /**
                 *
                 */
                statusCode: number;
                /**
                 *
                 */
                contentLength: number;
                /**
                 *
                 */
                headers: { [name: string]: string[] };
                /**
                 *
                 */
                body: Binary;
            }
        }
    }
}
