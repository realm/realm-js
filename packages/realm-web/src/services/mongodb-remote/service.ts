import { Transport } from "../../transports";

import { create as createDatabase } from "./database";

export function create(transport: Transport, serviceName: string = "mongo-db") {
    return { db: createDatabase.bind(null, transport, serviceName) };
}
