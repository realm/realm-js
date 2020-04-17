import { Transport } from "../transports";
import { create as createFunctionsFactory } from "../FunctionsFactory";
import { deserialize, serialize } from "./utils";

/**
 * A remote collection of documents.
 */
export class RemoteMongoDBCollection<
    T extends Realm.Services.RemoteMongoDB.Document
> implements Realm.Services.RemoteMongoDB.RemoteMongoDBCollection<T> {
    /**
     * The function factory to use when sending requests to the service.
     */
    private functions: Realm.FunctionsFactory;

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
        update: object,
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
        update: object,
        options: Realm.Services.RemoteMongoDB.FindOneAndModifyOptions = {},
    ) {
        return this.functions.findOneAndReplace({
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
    aggregate(pipeline: object[]) {
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
    insertOne(document: T) {
        return this.functions.insertOne({
            database: this.databaseName,
            collection: this.collectionName,
            document,
        });
    }

    /** @inheritdoc */
    insertMany(documents: T[]) {
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
        update: object,
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
        update: object,
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
): Realm.Services.RemoteMongoDB.RemoteMongoDBCollection<T> {
    return new RemoteMongoDBCollection<T>(
        transport,
        serviceName,
        databaseName,
        collectionName,
    );
}

/**
 * Creates an Remote MongoDB Database
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
) {
    return {
        // 👇 is using "as" since it's too complicated to force the result of bind to remain generic over T
        collection: createCollection.bind(
            null,
            transport,
            serviceName,
            databaseName,
        ) as <T extends Realm.Services.RemoteMongoDB.Document = any>(
            name: string,
        ) => Realm.Services.RemoteMongoDB.RemoteMongoDBCollection<T>,
    };
}

/**
 * Creates an Remote MongoDB Service
 * Note: This method exists to enable function binding.
 *
 * @param transport The underlying transport
 * @param serviceName An optional service name
 * @returns The new Remote MongoDB Service
 */
export function createService(transport: Transport, serviceName = "mongo-db") {
    return { db: createDatabase.bind(null, transport, serviceName) };
}
