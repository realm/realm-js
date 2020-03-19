// See https://github.com/mongodb/stitch-js-sdk/blob/master/packages/core/sdk/src/auth/providers/anonymous/AnonymousAuthProvider.ts

import { Credentials } from "./Credentials";

/**
 * The AnonymousCredential is a [[StitchCredential]] that logs in
 * using the [Anonymous Authentication Provider](https://docs.mongodb.com/stitch/authentication/anonymous/).
 */
export class AnonymousCredentials extends Credentials
    implements Realm.Credentials {
    constructor(providerName = "anon-user") {
        super(providerName);
    }

    /** @inheritdoc */
    public readonly providerType = "anon-user";

    /** @inheritdoc */
    public readonly material = {};
}
