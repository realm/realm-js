// See https://github.com/mongodb/stitch-js-sdk/blob/master/packages/core/sdk/src/auth/providers/userpass/UserPasswordCredential.ts
// TODO: Consider renaming to "EmailPasswordCredential" since that's the name on the docs
// TODO: Add the client handling password change / reset https://github.com/mongodb/stitch-js-sdk/blob/master/packages/core/sdk/src/auth/providers/userpass/CoreUserPasswordAuthProviderClient.ts

import { Credentials } from "./Credentials";

/**
 * The UsernamePasswordCredential is a [[StitchCredential]] that logs in
 * using the [Username Password Authentication Provider](https://docs.mongodb.com/stitch/authentication/userpass/).
 */
export class UsernamePasswordCredentials extends Credentials
    implements Realm.Credentials {
    public readonly providerName = "local-userpass";
    public readonly providerType = "local-userpass";

    public readonly username: string;
    public readonly password: string;

    constructor(username: string, password: string) {
        super();
        this.username = username;
        this.password = password;
    }

    public get material() {
        return {
            username: this.username,
            password: this.password
        };
    }
}
