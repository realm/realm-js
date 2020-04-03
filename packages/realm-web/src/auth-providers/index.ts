import { Transport } from "../transports";

import { EmailPasswordAuthProvider } from "./EmailPasswordAuthProvider";
import { ApiKeyAuthProvider } from "./ApiKeyAuthProvider";

export function create(transport: Transport): Realm.AuthProviders {
    return {
        emailPassword: new EmailPasswordAuthProvider(transport),
        apiKey: new ApiKeyAuthProvider(transport)
    };
}
