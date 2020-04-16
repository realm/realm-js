// See https://github.com/mongodb/stitch-js-sdk/blob/master/packages/core/sdk/src/auth/providers/anonymous/AnonymousAuthProvider.ts

import { Credentials } from "./Credentials";

/**
 * Credentials that logs in using the [Anonymous Authentication Provider](https://docs.mongodb.com/stitch/authentication/anonymous/).
 */
export class AnonymousCredentials extends Credentials
    implements Realm.Credentials {
    /**
     * Create credentials to authenticate a user anonymously.
     *
     * @param providerName An optional custom name for the authentication provider.
     */
    constructor(providerName = "anon-user") {
        super(providerName);
    }

    /** @inheritdoc */
    public readonly providerType = "anon-user";

    /** @inheritdoc */
    public toJSON() {
        return {};
    }
}
