////////////////////////////////////////////////////////////////////////////
//
// Copyright 2020 Realm Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
////////////////////////////////////////////////////////////////////////////

type AnonymousPayload = Realm.Credentials.AnonymousPayload;
type ApiKeyPayload = Realm.Credentials.ApiKeyPayload;
type EmailPasswordPayload = Realm.Credentials.EmailPasswordPayload;

/**
 * Instances of this class can be passed to the `app.logIn` method to authenticate an end-user.
 */
export class Credentials<PayloadType extends object>
    implements Realm.Credentials<PayloadType> {
    /**
     * Creates credentials that logs in using the [Anonymous Provider](https://docs.mongodb.com/stitch/authentication/anonymous/).
     *
     * @returns The credentials instance, which can be passed to `app.logIn`.
     */
    static anonymous() {
        return new Credentials<AnonymousPayload>("anon-user", "anon-user", {});
    }

    /**
     * Creates credentials that logs in using the [API Key Provider](https://docs.mongodb.com/stitch/authentication/api-key/).
     *
     * @param key The secret content of the API key.
     * @returns The credentials instance, which can be passed to `app.logIn`.
     */
    static apiKey(key: string) {
        return new Credentials<ApiKeyPayload>("api-key", "api-key", {
            key,
        });
    }

    /**
     * Creates credentials that logs in using the [Email/Password Provider](https://docs.mongodb.com/stitch/authentication/userpass/).
     * Note: This was formerly known as the "Username/Password" provider.
     *
     * @param email The end-users email address.
     * @param password The end-users password.
     * @returns The credentials instance, which can be passed to `app.logIn`.
     */
    static emailPassword(email: string, password: string) {
        return new Credentials<EmailPasswordPayload>(
            "local-userpass",
            "local-userpass",
            {
                username: email,
                password,
            },
        );
    }

    /**
     * The name of the authentication provider used when authenticating.
     * Note: This is the same as the type for all current authentication providers in the service and mainly required for forwards-compatibility.
     */
    public readonly providerName: string;

    /**
     * The type of the authentication provider used when authenticating.
     */
    public readonly providerType: string;

    /**
     * The data being sent to the service when authenticating.
     */
    public readonly payload: PayloadType;

    constructor(name: string, type: "anon-user", payload: AnonymousPayload);
    constructor(name: string, type: "api-key", payload: ApiKeyPayload);
    constructor(
        name: string,
        type: "local-userpass",
        payload: EmailPasswordPayload,
    );

    /**
     * Constructs an instance of credentials.
     *
     * @param providerName The name of the authentication provider used when authenticating.
     * @param providerType The type of the authentication provider used when authenticating.
     * @param payload The data being sent to the service when authenticating.
     */
    constructor(
        providerName: string,
        providerType: string,
        payload: PayloadType,
    ) {
        this.providerName = providerName;
        this.providerType = providerType;
        this.payload = payload;
    }
}
