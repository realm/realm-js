import { EJSON } from "bson";

import { Transport } from "../../transports";
import { create as createFunctionsFactory } from "../../FunctionsFactory";

// This class is implemented to an interface documented in the services.d.ts - no need to duplicate that
// tslint:disable:completed-docs

export function create<T extends object = any>(
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

function serialize(obj: object): any {
    return EJSON.serialize(obj);
}

function deserialize(result: object | object[]): any {
    if (Array.isArray(result)) {
        return result.map((doc: any) => EJSON.deserialize(doc));
    } else {
        return EJSON.deserialize(result);
    }
}

export class RemoteMongoDBCollection<T extends object>
    implements Realm.Services.RemoteMongoDB.RemoteMongoDBCollection<T> {
    private functions: Realm.FunctionsFactory;

    constructor(
        transport: Transport,
        serviceName: string,
        private readonly databaseName: string,
        private readonly collectionName: string
    ) {
        this.functions = createFunctionsFactory({ transport, serviceName });
    }

    async find(
        query: object = {},
        options?: Realm.Services.RemoteMongoDB.FindOptions
    ) {
        const result = await this.functions.find({
            query: serialize(query),
            database: this.databaseName,
            collection: this.collectionName,
            ...options
        });
        // Deserialize the result
        return deserialize(result);
    }

    async findOne(
        query: object = {},
        options?: Realm.Services.RemoteMongoDB.FindOneOptions
    ) {
        const result = await this.functions.findOne({
            query: serialize(query),
            database: this.databaseName,
            collection: this.collectionName,
            ...options
        });
        return deserialize(result);
    }

    async count(
        query: object = {},
        options?: Realm.Services.RemoteMongoDB.CountOptions
    ) {
        const result = await this.functions.count({
            query: serialize(query),
            database: this.databaseName,
            collection: this.collectionName,
            ...options
        });
        return deserialize(result);
    }

    async insertOne(document: T) {
        const result = await this.functions.insertOne({
            document,
            database: this.databaseName,
            collection: this.collectionName
        });
        return deserialize(result);
    }

    async insertMany(documents: T[]) {
        const result = await this.functions.insertMany({
            documents: documents.map(serialize),
            database: this.databaseName,
            collection: this.collectionName
        });
        return deserialize(result);
    }
}
