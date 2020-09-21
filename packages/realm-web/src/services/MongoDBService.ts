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

import { Fetcher } from "../Fetcher";
import { FunctionsFactory } from "../FunctionsFactory";
import { WatchStream, WatchStreamState } from "../WatchStream";

type Document = Realm.Services.MongoDB.Document;
type NewDocument<T extends Document> = Realm.Services.MongoDB.NewDocument<T>;
type ChangeEvent<T extends Document> = Realm.Services.MongoDB.ChangeEvent<T>;

/**
 * A remote collection of documents.
 */
class MongoDBCollection<T extends Document>
    implements Realm.Services.MongoDB.MongoDBCollection<T> {
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
     *
     * @param fetcher The fetcher to use when requesting the service.
     * @param serviceName The name of the remote service.
     * @param databaseName The name of the database.
     * @param collectionName The name of the remote collection.
     */
    constructor(
        fetcher: Fetcher,
        serviceName: string,
        databaseName: string,
        collectionName: string,
    ) {
        this.functions = FunctionsFactory.create(fetcher, {
            serviceName,
        });
        this.databaseName = databaseName;
        this.collectionName = collectionName;
        this.serviceName = serviceName;
        this.fetcher = fetcher;
    }

    /** @inheritdoc */
    find(
        filter: Realm.Services.MongoDB.Filter = {},
        options: Realm.Services.MongoDB.FindOptions = {},
    ) {
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
    ) {
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
    ) {
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
    ) {
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
    ) {
        return this.functions.findOneAndReplace({
            database: this.databaseName,
            collection: this.collectionName,
            filter,
            sort: options.sort,
            projection: options.projection,
        });
    }

    /** @inheritdoc */
    aggregate(pipeline: Realm.Services.MongoDB.AggregatePipelineStage[]) {
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
    ) {
        return this.functions.count({
            database: this.databaseName,
            collection: this.collectionName,
            query: filter,
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
            documents,
        });
    }

    /** @inheritdoc */
    deleteOne(filter: Realm.Services.MongoDB.Filter = {}) {
        return this.functions.deleteOne({
            database: this.databaseName,
            collection: this.collectionName,
            query: filter,
        });
    }

    /** @inheritdoc */
    deleteMany(filter: Realm.Services.MongoDB.Filter = {}) {
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
    ) {
        return this.functions.updateOne({
            database: this.databaseName,
            collection: this.collectionName,
            query: filter,
            update,
            upsert: options.upsert,
        });
    }

    /** @inheritdoc */
    updateMany(
        filter: Realm.Services.MongoDB.Filter,
        update: Realm.Services.MongoDB.Update,
        options: Realm.Services.MongoDB.UpdateOptions = {},
    ) {
        return this.functions.updateMany({
            database: this.databaseName,
            collection: this.collectionName,
            query: filter,
            update,
            upsert: options.upsert,
        });
    }

    /** @inheritdoc */
    async *watch({
        ids = undefined,
        filter = undefined,
    }: {
        ids?: T["_id"][];
        filter?: Realm.Services.MongoDB.Filter;
    } = {}): AsyncGenerator<ChangeEvent<T>> {
        const iterator = await this.functions.callFunctionStreaming("watch", {
            database: this.databaseName,
            collection: this.collectionName,
            ids,
            filter,
        });
        const watchStream = new WatchStream<T>();
        for await (const chunk of iterator) {
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

/**
 * Creates an Remote MongoDB Collection.
 * Note: This method exists to enable function binding.
 *
 * @param fetcher The underlying fetcher.
 * @param serviceName A service name.
 * @param databaseName A database name.
 * @param collectionName A collection name.
 * @returns The collection.
 */
export function createCollection<
    T extends Realm.Services.MongoDB.Document = any
>(
    fetcher: Fetcher,
    serviceName: string,
    databaseName: string,
    collectionName: string,
): MongoDBCollection<T> {
    return new MongoDBCollection<T>(
        fetcher,
        serviceName,
        databaseName,
        collectionName,
    );
}

/**
 * Creates a Remote MongoDB Database.
 * Note: This method exists to enable function binding.
 *
 * @param fetcher The underlying fetcher
 * @param serviceName A service name
 * @param databaseName A database name
 * @returns The database.
 */
export function createDatabase(
    fetcher: Fetcher,
    serviceName: string,
    databaseName: string,
): Realm.Services.MongoDBDatabase {
    return {
        collection: createCollection.bind(
            null,
            fetcher,
            serviceName,
            databaseName,
        ) as Realm.Services.MongoDBDatabase["collection"],
    };
}

/**
 * Creates a Remote MongoDB Service.
 * Note: This method exists to enable function binding.
 *
 * @param fetcher The underlying fetcher.
 * @param serviceName An optional service name.
 * @returns The service.
 */
export function createService(fetcher: Fetcher, serviceName = "mongo-db") {
    return { db: createDatabase.bind(null, fetcher, serviceName) };
}
