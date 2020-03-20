import { Transport } from "../../transports";

import { create as createCollection } from "./collection";

export function create(
    transport: Transport,
    serviceName: string,
    databaseName: string
) {
    return {
        collection: createCollection.bind(
            null,
            transport,
            serviceName,
            databaseName
        ) as <T extends object = any>(
            name: string
        ) => Realm.Services.RemoteMongoDB.RemoteMongoDBCollection<T>
        // Using "as" since it's too complicated to force the result of bind to remain generic over T
    };
}
