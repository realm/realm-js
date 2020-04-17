import { Transport } from "../transports";

import { EmailPasswordAuthProvider } from "./EmailPasswordAuthProvider";
import { ApiKeyAuthProvider } from "./ApiKeyAuthProvider";

// TODO: Consider if we should query the service for enabled authentication providers before creating clients.

/**
 * Create an apps authentication providers.
 *
 * @param transport The transport used when sending requests to the service.
 * @returns An object with interfaces to all possible authentication provider the app might have.
 */
export function create(transport: Transport): Realm.AuthProviders {
    return {
        emailPassword: new EmailPasswordAuthProvider(transport),
        apiKey: new ApiKeyAuthProvider(transport),
    };
}
