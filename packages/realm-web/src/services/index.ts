import { Transport } from "../transports";

import { createService as createMongoDBRemoteService } from "./RemoteMongoDBService";
import { createService as createHttpService } from "./HTTPService";

export function create(transport: Transport): Realm.Services.ServicesFactory {
    return {
        mongodb: createMongoDBRemoteService.bind(null, transport),
        http: createHttpService.bind(null, transport)
    };
}
