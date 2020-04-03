import { Transport } from "../../transports";

import { create as createCollection } from "./collection";

export function create(
    transport: Transport,
    serviceName: string,
    databaseName: string
) {
    return {
        // 👇 is using "as" since it's too complicated to force the result of bind to remain generic over T
        collection: createCollection.bind(
            null,
            transport,
            serviceName,
            databaseName
        ) as <T extends Realm.Services.RemoteMongoDB.Document = any>(
            name: string
        ) => Realm.Services.RemoteMongoDB.RemoteMongoDBCollection<T>
    };
}
