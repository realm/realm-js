// See https://github.com/mongodb/stitch-js-sdk/blob/master/packages/core/sdk/src/auth/providers/userpass/UserPasswordCredential.ts
// TODO: Consider renaming to "EmailPasswordCredential" since that's the name on the docs
// TODO: Add the client handling password change / reset https://github.com/mongodb/stitch-js-sdk/blob/master/packages/core/sdk/src/auth/providers/userpass/CoreUserPasswordAuthProviderClient.ts

import { Credentials } from "./Credentials";

/**
 * Credentials that logs in using the [Username Password Authentication Provider](https://docs.mongodb.com/stitch/authentication/userpass/).
 */
export class UsernamePasswordCredentials extends Credentials
    implements Realm.Credentials {
    /** @inheritdoc */
    public readonly providerType = "local-userpass";

    /** Username */
    public readonly username: string;

    /** Password */
    public readonly password: string;

    /**
     * Create credentials to authenticate a user from a username and their password.
     *
     * @param username The end-users username.
     * @param password The end-users password.
     * @param providerName An optional custom name for the authentication provider.
     */
    constructor(
        username: string,
        password: string,
        providerName = "local-userpass",
    ) {
        super(providerName);
        this.username = username;
        this.password = password;
    }

    /** @inheritdoc */
    public toJSON() {
        return {
            username: this.username,
            password: this.password,
        };
    }
}
