import { Transport } from "../../transports";
import { create as createFunctionsFactory } from "../../FunctionsFactory";
import { deserialize, serialize } from "../utils";

// This class is implemented to an interface documented in the services.d.ts - no need to duplicate that
// tslint:disable:completed-docs

export function create<T extends Realm.Services.RemoteMongoDB.Document = any>(
    transport: Transport,
    serviceName: string,
    databaseName: string,
    collectionName: string
): Realm.Services.RemoteMongoDB.RemoteMongoDBCollection<T> {
    return new RemoteMongoDBCollection<T>(
        transport,
        serviceName,
        databaseName,
        collectionName
    );
}

export class RemoteMongoDBCollection<
    T extends Realm.Services.RemoteMongoDB.Document
> implements Realm.Services.RemoteMongoDB.RemoteMongoDBCollection<T> {
    private functions: Realm.FunctionsFactory;

    constructor(
        transport: Transport,
        serviceName: string,
        private readonly databaseName: string,
        private readonly collectionName: string
    ) {
        this.functions = createFunctionsFactory({
            transport,
            serviceName,
            responseTransformation: deserialize
        });
    }

    find(
        query: object = {},
        options: Realm.Services.RemoteMongoDB.FindOptions = {}
    ) {
        return this.functions.find({
            database: this.databaseName,
            collection: this.collectionName,
            query: serialize(query),
            project: options.projection,
            sort: options.sort,
            limit: options.limit
        });
    }

    findOne(
        query: object = {},
        options: Realm.Services.RemoteMongoDB.FindOneOptions = {}
    ) {
        return this.functions.findOne({
            database: this.databaseName,
            collection: this.collectionName,
            query: serialize(query),
            project: options.projection,
            sort: options.sort
        });
    }

    findOneAndUpdate(
        query: object = {},
        update: object,
        options: Realm.Services.RemoteMongoDB.FindOneAndModifyOptions = {}
    ) {
        return this.functions.findOneAndUpdate({
            database: this.databaseName,
            collection: this.collectionName,
            filter: serialize(query),
            update: serialize(update),
            sort: options.sort,
            projection: options.projection,
            upsert: options.upsert,
            returnNewDocument: options.returnNewDocument
        });
    }

    findOneAndReplace(
        query: object = {},
        update: object,
        options: Realm.Services.RemoteMongoDB.FindOneAndModifyOptions = {}
    ) {
        return this.functions.findOneAndReplace({
            database: this.databaseName,
            collection: this.collectionName,
            filter: serialize(query),
            update: serialize(update),
            sort: options.sort,
            projection: options.projection,
            upsert: options.upsert,
            returnNewDocument: options.returnNewDocument
        });
    }

    findOneAndDelete(
        query: object = {},
        options: Realm.Services.RemoteMongoDB.FindOneOptions = {}
    ) {
        return this.functions.findOneAndReplace({
            database: this.databaseName,
            collection: this.collectionName,
            filter: serialize(query),
            sort: options.sort,
            projection: options.projection
        });
    }

    aggregate(pipeline: object[]) {
        return this.functions.aggregate({
            database: this.databaseName,
            collection: this.collectionName,
            pipeline: pipeline.map(serialize)
        });
    }

    count(
        query: object = {},
        options: Realm.Services.RemoteMongoDB.CountOptions = {}
    ) {
        return this.functions.count({
            database: this.databaseName,
            collection: this.collectionName,
            query: serialize(query),
            limit: options.limit
        });
    }

    insertOne(document: T) {
        return this.functions.insertOne({
            database: this.databaseName,
            collection: this.collectionName,
            document
        });
    }

    insertMany(documents: T[]) {
        return this.functions.insertMany({
            database: this.databaseName,
            collection: this.collectionName,
            documents: documents.map(serialize)
        });
    }

    deleteOne(query: object = {}) {
        return this.functions.deleteOne({
            database: this.databaseName,
            collection: this.collectionName,
            query: serialize(query)
        });
    }

    deleteMany(query: object = {}) {
        return this.functions.deleteMany({
            database: this.databaseName,
            collection: this.collectionName,
            query: serialize(query)
        });
    }

    updateOne(
        query: object,
        update: object,
        options: Realm.Services.RemoteMongoDB.UpdateOptions = {}
    ) {
        return this.functions.updateOne({
            database: this.databaseName,
            collection: this.collectionName,
            query: serialize(query),
            update,
            upsert: options.upsert
        });
    }

    updateMany(
        query: object,
        update: object,
        options: Realm.Services.RemoteMongoDB.UpdateOptions = {}
    ) {
        return this.functions.updateMany({
            database: this.databaseName,
            collection: this.collectionName,
            query: serialize(query),
            update,
            upsert: options.upsert
        });
    }
}
