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
import { User, createFactory } from "../internal";
export class MongoClient {
    /** @internal */
    user;
    databaseName;
    name;
    serviceName;
    functions;
    /**
     * Construct a remote collection of documents
     */
    /** @internal */
    constructor(user, serviceName, databaseName, collectionName) {
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
    find(filter = {}, options = {}) {
        return this.functions.find({
            database: this.databaseName,
            collection: this.name,
            query: filter,
            project: options.projection,
            sort: options.sort,
            limit: options.limit,
        });
    }
    /**
     * Finds a document which matches the provided filter.
     *
     * @param filter A filter applied to narrow down the result.
     * @param options Additional options to apply.
     * @returns The document.
     */
    findOne(filter = {}, options = {}) {
        return this.functions.findOne({
            database: this.databaseName,
            collection: this.name,
            query: filter,
            project: options.projection,
            sort: options.sort,
        });
    }
    /**
     * Finds a document which matches the provided query and performs the desired update to individual fields.
     *
     * @param filter A filter applied to narrow down the result.
     * @param update The new values for the document.
     * @param options Additional options to apply.
     * @returns The document found before updating it.
     */
    findOneAndUpdate(filter = {}, update, options = {}) {
        return this.functions.findOneAndUpdate({
            database: this.databaseName,
            collection: this.name,
            filter,
            update,
            sort: options.sort,
            projection: options.projection,
            upsert: options.upsert,
            returnNewDocument: options.returnNewDocument,
        });
    }
    /**
     * Finds a document which matches the provided filter and replaces it with a new document.
     *
     * @param filter A filter applied to narrow down the result.
     * @param replacement The new replacing document.
     * @param options Additional options to apply.
     * @returns The document found before replacing it.
     */
    findOneAndReplace(filter = {}, replacement, options = {}) {
        return this.functions.findOneAndReplace({
            database: this.databaseName,
            collection: this.name,
            filter: filter,
            update: replacement,
            sort: options.sort,
            projection: options.projection,
            upsert: options.upsert,
            returnNewDocument: options.returnNewDocument,
        });
    }
    /**
     * Finds a document which matches the provided filter and deletes it
     *
     * @param filter A filter applied to narrow down the result.
     * @param options Additional options to apply.
     * @returns The document found before deleting it.
     */
    findOneAndDelete(filter = {}, options = {}) {
        return this.functions.findOneAndReplace({
            database: this.databaseName,
            collection: this.name,
            filter,
            sort: options.sort,
            projection: options.projection,
        });
    }
    /**
     * Runs an aggregation framework pipeline against this collection.
     *
     * @param pipeline An array of aggregation pipeline stages.
     * @returns The result.
     */
    aggregate(pipeline) {
        return this.functions.aggregate({
            database: this.databaseName,
            collection: this.name,
            pipeline,
        });
    }
    /**
     * Counts the number of documents in this collection matching the provided filter.
     */
    count(filter = {}, options = {}) {
        return this.functions.count({
            database: this.databaseName,
            collection: this.name,
            query: filter,
            limit: options.limit,
        });
    }
    /**
     * Inserts a single document into the collection.
     * Note: If the document is missing an _id, one will be generated for it by the server.
     *
     * @param document The document.
     * @returns The result.
     */
    insertOne(document) {
        return this.functions.insertOne({
            database: this.databaseName,
            collection: this.name,
            document,
        });
    }
    /**
     * Inserts an array of documents into the collection.
     * If any values are missing identifiers, they will be generated by the server.
     *
     * @param document The array of documents.
     * @returns The result.
     */
    insertMany(documents) {
        return this.functions.insertMany({
            database: this.databaseName,
            collection: this.name,
            documents,
        });
    }
    /**
     * Deletes a single matching document from the collection.
     *
     * @param filter A filter applied to narrow down the result.
     * @returns The result.
     */
    deleteOne(filter = {}) {
        return this.functions.deleteOne({
            database: this.databaseName,
            collection: this.name,
            query: filter,
        });
    }
    /**
     * Deletes multiple documents.
     *
     * @param filter A filter applied to narrow down the result.
     * @returns The result.
     */
    deleteMany(filter = {}) {
        return this.functions.deleteMany({
            database: this.databaseName,
            collection: this.name,
            query: filter,
        });
    }
    /**
     * Updates a single document matching the provided filter in this collection.
     *
     * @param filter A filter applied to narrow down the result.
     * @param update The new values for the document.
     * @param options Additional options to apply.
     * @returns The result.
     */
    updateOne(filter, update, options = {}) {
        return this.functions.updateOne({
            database: this.databaseName,
            collection: this.name,
            query: filter,
            update,
            upsert: options.upsert,
            arrayFilters: options.arrayFilters,
        });
    }
    /**
     * Updates multiple documents matching the provided filter in this collection.
     *
     * @param filter A filter applied to narrow down the result.
     * @param update The new values for the documents.
     * @param options Additional options to apply.
     * @returns The result.
     */
    updateMany(filter, update, options = {}) {
        return this.functions.updateMany({
            database: this.databaseName,
            collection: this.name,
            query: filter,
            update,
            upsert: options.upsert,
            arrayFilters: options.arrayFilters,
        });
    }
}
//# sourceMappingURL=MongoClient.js.map