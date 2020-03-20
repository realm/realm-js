import { Transport } from "../transports";

import { createService as createMongoDBRemoteService } from "./mongodb-remote";

export function create(transport: Transport): Realm.Services.ServicesFactory {
    return {
        mongodb: createMongoDBRemoteService.bind(null, transport)
    };
}
