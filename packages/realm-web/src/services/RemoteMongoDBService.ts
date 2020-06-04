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

import { Transport } from "../transports";
import { create as createFunctionsFactory } from "../FunctionsFactory";
import { deserialize, serialize } from "../utils/ejson";

type Document = Realm.Services.RemoteMongoDB.Document;
type NewDocument<T extends Document> = Realm.Services.RemoteMongoDB.NewDocument<
    T
>;

/**
 * A remote collection of documents.
 */
class RemoteMongoDBCollection<T extends Document>
    implements Realm.Services.RemoteMongoDB.RemoteMongoDBCollection<T> {
    /**
     * The function factory to use when sending requests to the service.
     */
    private functions: Realm.DefaultFunctionsFactory;

    /** The name of the database */
    private readonly databaseName: string;

    /** The name of the collection */
    private readonly collectionName: string;

    /**
     * Construct a remote collection of documents
     *
     * @param transport The transport to use when requesting the service.
     * @param serviceName The name of the remote service.
     * @param databaseName The name of the database.
     * @param collectionName The name of the remote collection.
     */
    constructor(
        transport: Transport,
        serviceName: string,
        databaseName: string,
        collectionName: string,
    ) {
        this.functions = createFunctionsFactory(transport, {
            serviceName,
            responseTransformation: deserialize,
        });
        this.databaseName = databaseName;
        this.collectionName = collectionName;
    }

    /** @inheritdoc */
    find(
        filter: Realm.Services.RemoteMongoDB.Filter = {},
        options: Realm.Services.RemoteMongoDB.FindOptions = {},
    ) {
        return this.functions.find({
            database: this.databaseName,
            collection: this.collectionName,
            query: serialize(filter),
            project: options.projection,
            sort: options.sort,
            limit: options.limit,
        });
    }

    /** @inheritdoc */
    findOne(
        filter: Realm.Services.RemoteMongoDB.Filter = {},
        options: Realm.Services.RemoteMongoDB.FindOneOptions = {},
    ) {
        return this.functions.findOne({
            database: this.databaseName,
            collection: this.collectionName,
            query: serialize(filter),
            project: options.projection,
            sort: options.sort,
        });
    }

    /** @inheritdoc */
    findOneAndUpdate(
        filter: Realm.Services.RemoteMongoDB.Filter = {},
        update: Partial<NewDocument<T>>,
        options: Realm.Services.RemoteMongoDB.FindOneAndModifyOptions = {},
    ) {
        return this.functions.findOneAndUpdate({
            database: this.databaseName,
            collection: this.collectionName,
            filter: serialize(filter),
            update: serialize(update),
            sort: options.sort,
            projection: options.projection,
            upsert: options.upsert,
            returnNewDocument: options.returnNewDocument,
        });
    }

    /** @inheritdoc */
    findOneAndReplace(
        filter: Realm.Services.RemoteMongoDB.Filter = {},
        replacement: NewDocument<T>,
        options: Realm.Services.RemoteMongoDB.FindOneAndModifyOptions = {},
    ) {
        return this.functions.findOneAndReplace({
            database: this.databaseName,
            collection: this.collectionName,
            filter: serialize(filter),
            update: serialize(replacement),
            sort: options.sort,
            projection: options.projection,
            upsert: options.upsert,
            returnNewDocument: options.returnNewDocument,
        });
    }

    /** @inheritdoc */
    findOneAndDelete(
        filter: Realm.Services.RemoteMongoDB.Filter = {},
        options: Realm.Services.RemoteMongoDB.FindOneOptions = {},
    ) {
        return this.functions.findOneAndReplace({
            database: this.databaseName,
            collection: this.collectionName,
            filter: serialize(filter),
            sort: options.sort,
            projection: options.projection,
        });
    }

    /** @inheritdoc */
    aggregate(pipeline: Realm.Services.RemoteMongoDB.AggregatePipelineStage[]) {
        return this.functions.aggregate({
            database: this.databaseName,
            collection: this.collectionName,
            pipeline: pipeline.map(serialize),
        });
    }

    /** @inheritdoc */
    count(
        filter: Realm.Services.RemoteMongoDB.Filter = {},
        options: Realm.Services.RemoteMongoDB.CountOptions = {},
    ) {
        return this.functions.count({
            database: this.databaseName,
            collection: this.collectionName,
            query: serialize(filter),
            limit: options.limit,
        });
    }

    /** @inheritdoc */
    insertOne(document: NewDocument<T>) {
        return this.functions.insertOne({
            database: this.databaseName,
            collection: this.collectionName,
            document,
        });
    }

    /** @inheritdoc */
    insertMany(documents: NewDocument<T>[]) {
        return this.functions.insertMany({
            database: this.databaseName,
            collection: this.collectionName,
            documents: documents.map(serialize),
        });
    }

    /** @inheritdoc */
    deleteOne(filter: Realm.Services.RemoteMongoDB.Filter = {}) {
        return this.functions.deleteOne({
            database: this.databaseName,
            collection: this.collectionName,
            query: serialize(filter),
        });
    }

    /** @inheritdoc */
    deleteMany(filter: Realm.Services.RemoteMongoDB.Filter = {}) {
        return this.functions.deleteMany({
            database: this.databaseName,
            collection: this.collectionName,
            query: serialize(filter),
        });
    }

    /** @inheritdoc */
    updateOne(
        filter: Realm.Services.RemoteMongoDB.Filter,
        update: Partial<NewDocument<T>>,
        options: Realm.Services.RemoteMongoDB.UpdateOptions = {},
    ) {
        return this.functions.updateOne({
            database: this.databaseName,
            collection: this.collectionName,
            query: serialize(filter),
            update,
            upsert: options.upsert,
        });
    }

    /** @inheritdoc */
    updateMany(
        filter: Realm.Services.RemoteMongoDB.Filter,
        update: Partial<NewDocument<T>>,
        options: Realm.Services.RemoteMongoDB.UpdateOptions = {},
    ) {
        return this.functions.updateMany({
            database: this.databaseName,
            collection: this.collectionName,
            query: serialize(filter),
            update,
            upsert: options.upsert,
        });
    }
}

/**
 * Creates an Remote MongoDB Collection
 * Note: This method exists to enable function binding.
 *
 * @param transport The underlying transport
 * @param serviceName A service name
 * @param databaseName A database name
 * @param collectionName A collection name
 * @returns The new Remote MongoDB Database
 */
export function createCollection<
    T extends Realm.Services.RemoteMongoDB.Document = any
>(
    transport: Transport,
    serviceName: string,
    databaseName: string,
    collectionName: string,
): RemoteMongoDBCollection<T> {
    return new RemoteMongoDBCollection<T>(
        transport,
        serviceName,
        databaseName,
        collectionName,
    );
}

/**
 * Creates a Remote MongoDB Database
 * Note: This method exists to enable function binding.
 *
 * @param transport The underlying transport
 * @param serviceName A service name
 * @param databaseName A database name
 * @returns The new Remote MongoDB Database
 */
export function createDatabase(
    transport: Transport,
    serviceName: string,
    databaseName: string,
): Realm.Services.RemoteMongoDBDatabase {
    return {
        collection: createCollection.bind(
            null,
            transport,
            serviceName,
            databaseName,
        ),
    };
}

/**
 * Creates a Remote MongoDB Service
 * Note: This method exists to enable function binding.
 *
 * @param transport The underlying transport
 * @param serviceName An optional service name
 * @returns The new Remote MongoDB Service
 */
export function createService(transport: Transport, serviceName = "mongo-db") {
    return { db: createDatabase.bind(null, transport, serviceName) };
}
