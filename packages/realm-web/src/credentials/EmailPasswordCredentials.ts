// See https://github.com/mongodb/stitch-js-sdk/blob/master/packages/core/sdk/src/auth/providers/userpass/UserPasswordCredential.ts
// TODO: Consider renaming to "EmailPasswordCredential" since that's the name on the docs
// TODO: Add the client handling password change / reset https://github.com/mongodb/stitch-js-sdk/blob/master/packages/core/sdk/src/auth/providers/userpass/CoreUserPasswordAuthProviderClient.ts

import { Credentials } from "./Credentials";

/**
 * Credentials that logs in using the [Username Password Authentication Provider](https://docs.mongodb.com/stitch/authentication/userpass/).
 */
export class EmailPasswordCredentials extends Credentials
    implements Realm.Credentials {
    /** @inheritdoc */
    public readonly providerType = "local-userpass";

    /** Username */
    public readonly email: string;

    /** Password */
    public readonly password: string;

    /**
     * Create credentials to authenticate a user from an email and their password.
     *
     * @param email The end-users email.
     * @param password The end-users password.
     * @param providerName An optional custom name for the authentication provider.
     */
    constructor(
        email: string,
        password: string,
        providerName = "local-userpass",
    ) {
        super(providerName);
        this.email = email;
        this.password = password;
    }

    /** @inheritdoc */
    public toJSON() {
        return {
            username: this.email,
            password: this.password,
        };
    }
}
