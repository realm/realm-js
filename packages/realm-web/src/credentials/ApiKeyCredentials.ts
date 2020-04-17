// See https://github.com/mongodb/stitch-js-sdk/blob/14e23e4c0b08a9e8879fcf4ac204d84aec94665d/packages/core/sdk/src/auth/providers/userapikey/UserApiKeyCredential.ts

import { Credentials } from "./Credentials";

/**
 * Credentials that logs in using the [API Key Provider](https://docs.mongodb.com/stitch/authentication/api-key/).
 */
export class ApiKeyCredentials extends Credentials
    implements Realm.Credentials {
    /**
     * The secret content of the API key.
     */
    public readonly key: string;

    /**
     * Create credentials to authenticate a user using an API key.
     *
     * @param key The secret content of the API key.
     * @param providerName An optional custom name for the authentication provider.
     */
    constructor(key: string, providerName = "api-key") {
        super(providerName);
        this.key = key;
    }

    /** @inheritdoc */
    public readonly providerType = "api-key";

    /** @inheritdoc */
    public toJSON() {
        return { key: this.key };
    }
}
