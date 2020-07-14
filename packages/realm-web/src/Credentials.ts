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

export type AnonymousPayload = Realm.Credentials.AnonymousPayload;
export type ApiKeyPayload = Realm.Credentials.ApiKeyPayload;
export type EmailPasswordPayload = Realm.Credentials.EmailPasswordPayload;
export type OAuth2RedirectPayload = Realm.Credentials.OAuth2RedirectPayload;
export type GooglePayload = Realm.Credentials.GooglePayload;
export type FacebookPayload = Realm.Credentials.FacebookPayload;
export type FunctionPayload = Realm.Credentials.FunctionPayload;
export type JWTPayload = Realm.Credentials.JWTPayload;
export type ApplePayload = Realm.Credentials.ApplePayload;

// TODO: Ensure the static interface of the Credentials class implements the static interface of Realm.Credentials
// See https://stackoverflow.com/a/43484801

/**
 * Instances of this class can be passed to the `app.logIn` method to authenticate an end-user.
 */
export class Credentials<PayloadType extends object = any>
    implements Realm.Credentials<PayloadType> {
    /**
     * Creates credentials that logs in using the [Anonymous Provider](https://docs.mongodb.com/realm/authentication/anonymous/).
     *
     * @returns The credentials instance, which can be passed to `app.logIn`.
     */
    static anonymous() {
        return new Credentials<AnonymousPayload>("anon-user", "anon-user", {});
    }

    /**
     * Creates credentials that logs in using the [API Key Provider](https://docs.mongodb.com/realm/authentication/api-key/).
     *
     * @deprecated Use `Credentials.apiKey`.
     *
     * @param key The secret content of the API key.
     * @returns The credentials instance, which can be passed to `app.logIn`.
     */
    static userApiKey(key: string) {
        return new Credentials<ApiKeyPayload>("api-key", "api-key", { key });
    }

    /**
     * Creates credentials that logs in using the [API Key Provider](https://docs.mongodb.com/realm/authentication/api-key/).
     *
     * @deprecated Use `Credentials.apiKey`.
     *
     * @param key The secret content of the API key.
     * @returns The credentials instance, which can be passed to `app.logIn`.
     */
    static serverApiKey(key: string) {
        return new Credentials<ApiKeyPayload>("api-key", "api-key", { key });
    }

    /**
     * Creates credentials that logs in using the [API Key Provider](https://docs.mongodb.com/realm/authentication/api-key/).
     *
     * @param key The secret content of the API key.
     * @returns The credentials instance, which can be passed to `app.logIn`.
     */
    static apiKey(key: string) {
        return new Credentials<ApiKeyPayload>("api-key", "api-key", { key });
    }

    /**
     * Creates credentials that logs in using the [Email/Password Provider](https://docs.mongodb.com/realm/authentication/email-password/).
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
     * Creates credentials that logs in using the [Custom Function Provider](https://docs.mongodb.com/realm/authentication/custom-function/).
     *
     * @param payload The custom payload as expected by the server.
     * @returns The credentials instance, which can be passed to `app.logIn`.
     */
    static function<PayloadType extends FunctionPayload = FunctionPayload>(
        payload: PayloadType,
    ) {
        return new Credentials<PayloadType>(
            "custom-function",
            "custom-function",
            payload,
        );
    }

    /**
     * Creates credentials that logs in using the [Custom JWT Provider](https://docs.mongodb.com/realm/authentication/custom-jwt/).
     *
     * @param token The JSON Web Token (JWT).
     * @returns The credentials instance, which can be passed to `app.logIn`.
     */
    static jwt(token: string) {
        return new Credentials<JWTPayload>("custom-token", "custom-token", {
            token,
        });
    }

    /**
     * Creates credentials that logs in using the [Google Provider](https://docs.mongodb.com/realm/authentication/google/).
     *
     * @param redirectUrlOrAuthCode The URL that users should be redirected to or the auth code returned from Google.
     * @returns The credentials instance, which can be passed to `app.logIn`.
     */
    static google<
        PayloadType extends object = OAuth2RedirectPayload | GooglePayload
    >(redirectUrlOrAuthCode: string) {
        return new Credentials<PayloadType>(
            "oauth2-google",
            "oauth2-google",
            redirectUrlOrAuthCode.includes("://")
                ? { redirectUrl: redirectUrlOrAuthCode }
                : { authCode: redirectUrlOrAuthCode },
        );
    }

    /**
     * Creates credentials that logs in using the [Facebook Provider](https://docs.mongodb.com/realm/authentication/facebook/).
     *
     * @param redirectUrlOrAccessToken The URL that users should be redirected to or the auth code returned from Facebook.
     * @returns The credentials instance, which can be passed to `app.logIn`.
     */
    static facebook<
        PayloadType extends object = OAuth2RedirectPayload | FacebookPayload
    >(redirectUrlOrAccessToken: string) {
        return new Credentials<PayloadType>(
            "oauth2-facebook",
            "oauth2-facebook",
            redirectUrlOrAccessToken.includes("://")
                ? { redirectUrl: redirectUrlOrAccessToken }
                : { accessToken: redirectUrlOrAccessToken },
        );
    }

    /**
     * Creates credentials that logs in using the [Apple ID Provider](https://docs.mongodb.com/realm/authentication/apple/).
     *
     * @param redirectUrlOrIdToken The URL that users should be redirected to or the id_token returned from Apple.
     * @returns The credentials instance, which can be passed to `app.logIn`.
     */
    static apple<
        PayloadType extends object = OAuth2RedirectPayload | ApplePayload
    >(redirectUrlOrIdToken: string) {
        return new Credentials<PayloadType>(
            "oauth2-apple",
            "oauth2-apple",
            redirectUrlOrIdToken.includes("://")
                ? { redirectUrl: redirectUrlOrIdToken }
                : {
                      // eslint-disable-next-line @typescript-eslint/camelcase
                      id_token: redirectUrlOrIdToken,
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
    constructor(
        name: string,
        type: "custom-function",
        payload: FunctionPayload,
    );
    constructor(name: string, type: "custom-token", payload: JWTPayload);
    constructor(
        name: string,
        type: "oauth2-google",
        payload: OAuth2RedirectPayload | GooglePayload,
    );
    constructor(
        name: string,
        type: "oauth2-facebook",
        payload: OAuth2RedirectPayload | FacebookPayload,
    );
    constructor(
        name: string,
        type: "oauth2-apple",
        payload: OAuth2RedirectPayload | ApplePayload,
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
