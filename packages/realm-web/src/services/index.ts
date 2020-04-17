import { Transport } from "../transports";

import { createService as createMongoDBRemoteService } from "./RemoteMongoDBService";
import { createService as createHttpService } from "./HTTPService";

/**
 * Create all services for a particular app.
 *
 * @param transport The transport to use when senting requests to the services.
 * @returns An object containing functions that create the individual services.
 */
export function create(transport: Transport): Realm.Services {
    return {
        mongodb: createMongoDBRemoteService.bind(null, transport),
        http: createHttpService.bind(null, transport),
    };
}
