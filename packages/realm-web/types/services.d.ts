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

declare namespace Realm {

    namespace Services {
        interface ServicesFactory {
            mongodb(serviceName?: string): {
                db(databaseName: string): {
                    collection<T extends object = any>(collectionName: string): RemoteMongoDB.RemoteMongoDBCollection<T>;
                };
            };
        }

        namespace RemoteMongoDB {
            interface FindOneOptions {
                /**
                 * Limits the fields to return for all matching documents. See
                 * [Tutorial: Project Fields to Return from Query](https://docs.mongodb.com/manual/tutorial/project-fields-from-query-results/).
                 */
                readonly project?: object;
            
                /**
                 * The order in which to return matching documents.
                 */
                readonly sort?: object;
            }

            interface FindOptions extends FindOneOptions {
                /**
                 * The maximum number of documents to return.
                 */
                readonly limit?: number;
            }

            interface FindOneAndModifyOptions {
                /**
                 * Optional: Limits the fields to return for all matching documents. See 
                 */
                readonly projection?: object;
            
                /**
                 * Optional: Specifies the query sort order. Sort documents specify one or more fields to 
                 * sort on where the value of each field indicates whether MongoDB should sort it in 
                 * ascending (1) or descending (0) order. 
                 * The sort order determines which document collection.findOneAndUpdate() affects.
                 */
                readonly sort?: object;

                /* 
                * Optional. Default: false.
                * A boolean that, if true, indicates that MongoDB should insert a new document that matches the
                * query filter when the query does not match any existing documents in the collection.
                */
                readonly upsert?: boolean;

                /* 
                * Optional. Default: false. 
                * A boolean that, if true, indicates that the action should return 
                * the document in its updated form instead of its original, pre-update form.
                */
                readonly returnNewDocument?: boolean;
            }

            interface CountOptions {
                /**
                 *  The maximum number of documents to count.
                 */
                readonly limit?: number;
            }

            interface UpdateOptions {
                /**
                 * When true, creates a new document if no document matches the query.
                 */ 
                readonly upsert?: boolean;
              }
            
            interface Document {
                _id: ObjectID;
            }

            interface InsertOneResult {
                readonly insertedId: ObjectID;
            }

            interface InsertManyResult {
                readonly insertedIds: ObjectID[];
            }

            interface DeleteResult {
                /**
                 * The number of documents that were deleted.
                 */
                readonly deletedCount: number;
              }
              
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

            interface RemoteMongoDBCollection<T extends object> {
                /**
                 * Finds the documents which match the provided query.
                 */
                find: (query?: object, options?: FindOptions) => Promise<(Document & T)[]>;

                /**
                 * Finds a document which matches the provided filter.
                 */
                findOne: (query?: object, options?: FindOptions) => Promise<Document & T>;

                /**
                 * Finds a document which matches the provided query and performs the desired update.
                 */
                // findOneAndUpdate(query: object, update: object, options?: FindOneAndModifyOptions): Promise<T | null>;

                /**
                 * Finds a document which matches the provided filter and replaces it with a new document.
                 */
                // findOneAndReplace(query: object, replacement: object, options?: FindOneAndModifyOptions): Promise<T | null>;

                /**
                 * Finds a document which matches the provided filter and deletes it
                 * TODO: Verify that the document is never returned upon deletion
                 */
                // findOneAndDelete(query: object, options?: FindOneAndModifyOptions): Promise<null>;

                /**
                 * Runs an aggregation framework pipeline against this collection.
                 * TODO: Verify pipeline and return type
                 */
                // aggregate(pipeline: Document[]): Promise<any>;

                /**
                 * Counts the number of documents in this collection matching the provided filter.
                 */
                count: (query?: object, options?: CountOptions) => Promise<number>;

                /**
                 * Encodes the provided value to BSON and inserts it. If the value is missing an identifier, one will be generated for it.
                 * @param value 
                 */
                insertOne(document: T): Promise<InsertOneResult>;

                /**
                 * Inserts a collection of documents.
                 * If any values are missing identifiers, they will be generated.
                 */
                insertMany(documents: T[]): Promise<InsertManyResult>;

                /**
                 * Deletes a single matching document from the collection.
                 */
                // deleteOne(query: object): Promise<DeleteResult>;

                /**
                 * Deletes multiple documents.
                 */
                // deleteMany(query: object): Promise<DeleteResult>;

                /**
                 * Updates a single document matching the provided filter in this collection.
                 */
                // updateOne(query: object, update: object, options?: UpdateOptions): Promise<UpdateResult>;

                /**
                 * Updates multiple documents matching the provided filter in this collection.
                 */
                // updateMany(query: object, update: object, options?: UpdateOptions): Promise<UpdateResult>;

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
    }
}