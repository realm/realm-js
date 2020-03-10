// See https://github.com/mongodb/stitch-js-sdk/blob/master/packages/core/sdk/src/auth/providers/anonymous/AnonymousAuthProvider.ts

import { Credentials } from "./Credentials";

/**
 * The AnonymousCredential is a [[StitchCredential]] that logs in
 * using the [Anonymous Authentication Provider](https://docs.mongodb.com/stitch/authentication/anonymous/).
 */
export class AnonymousCredentials extends Credentials
    implements Realm.Credentials {
    public static DEFAULT_PROVIDER_NAME = "anon-user";

    constructor(providerName = AnonymousCredentials.DEFAULT_PROVIDER_NAME) {
        super(providerName);
    }

    public readonly providerType = "anon-user";
    public readonly material = {};
}
