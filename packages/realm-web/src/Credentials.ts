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
type OAuth2RedirectPayload = Realm.Credentials.OAuth2RedirectPayload;
type GoogleAuthCodePayload = Realm.Credentials.GoogleAuthCodePayload;
type GooglePayload = Realm.Credentials.GooglePayload;
type FacebookPayload = Realm.Credentials.FacebookPayload;
type FunctionPayload = Realm.Credentials.FunctionPayload;
type JWTPayload = Realm.Credentials.JWTPayload;
type ApplePayload = Realm.Credentials.ApplePayload;

type GoogleOptions = OAuth2RedirectPayload | GoogleAuthCodePayload | { idToken: string };

/**
 * Types of an authentication provider.
 */
export type ProviderType =
  | "anon-user"
  | "api-key"
  | "local-userpass"
  | "custom-function"
  | "custom-token"
  | "oauth2-google"
  | "oauth2-facebook"
  | "oauth2-apple";

type SimpleObject = Record<string, unknown>;

// TODO: Ensure the static interface of the Credentials class implements the static interface of Realm.Credentials
// See https://stackoverflow.com/a/43484801

/**
 * Instances of this class can be passed to the `app.logIn` method to authenticate an end-user.
 */
export class Credentials<PayloadType extends SimpleObject = SimpleObject> implements Realm.Credentials<PayloadType> {
  /**
   * Creates credentials that logs in using the [Anonymous Provider](https://docs.mongodb.com/realm/authentication/anonymous/).
   * @returns The credentials instance, which can be passed to `app.logIn`.
   */
  static anonymous(): Credentials<AnonymousPayload> {
    return new Credentials<AnonymousPayload>("anon-user", "anon-user", {});
  }

  /**
   * Creates credentials that logs in using the [API Key Provider](https://docs.mongodb.com/realm/authentication/api-key/).
   * @param key The secret content of the API key.
   * @returns The credentials instance, which can be passed to `app.logIn`.
   */
  static apiKey(key: string): Credentials<ApiKeyPayload> {
    return new Credentials<ApiKeyPayload>("api-key", "api-key", { key });
  }

  /**
   * Creates credentials that logs in using the [Email/Password Provider](https://docs.mongodb.com/realm/authentication/email-password/).
   * Note: This was formerly known as the "Username/Password" provider.
   * @param email The end-users email address.
   * @param password The end-users password.
   * @returns The credentials instance, which can be passed to `app.logIn`.
   */
  static emailPassword(email: string, password: string): Credentials<EmailPasswordPayload> {
    return new Credentials<EmailPasswordPayload>("local-userpass", "local-userpass", {
      username: email,
      password,
    });
  }

  /**
   * Creates credentials that logs in using the [Custom Function Provider](https://docs.mongodb.com/realm/authentication/custom-function/).
   * @param payload The custom payload as expected by the server.
   * @returns The credentials instance, which can be passed to `app.logIn`.
   */
  static function<PayloadType extends FunctionPayload = FunctionPayload>(
    payload: PayloadType,
  ): Credentials<PayloadType> {
    return new Credentials<PayloadType>("custom-function", "custom-function", payload);
  }

  /**
   * Creates credentials that logs in using the [Custom JWT Provider](https://docs.mongodb.com/realm/authentication/custom-jwt/).
   * @param token The JSON Web Token (JWT).
   * @returns The credentials instance, which can be passed to `app.logIn`.
   */
  static jwt(token: string): Credentials<JWTPayload> {
    return new Credentials<JWTPayload>("custom-token", "custom-token", {
      token,
    });
  }

  /**
   * Creates credentials that logs in using the [Google Provider](https://docs.mongodb.com/realm/authentication/google/).
   * @param payload The URL that users should be redirected to, the auth code or id token from Google.
   * @returns The credentials instance, which can be passed to `app.logIn`.
   */
  static google<P extends OAuth2RedirectPayload | GooglePayload>(payload: GoogleOptions): Credentials<P> {
    return new Credentials<P>("oauth2-google", "oauth2-google", Credentials.derivePayload(payload) as P);
  }

  /**
   * @param payload The payload string.
   * @returns A payload object based on the string.
   */
  private static derivePayload(payload: GoogleOptions): SimpleObject {
    if (typeof payload === "string") {
      throw new Error("`google(<tokenString>)` has been deprecated.  Please use `google(<authCodeObject>).");
    } else if (Object.keys(payload).length === 1) {
      if ("authCode" in payload || "redirectUrl" in payload) {
        return payload;
      } else if ("idToken" in payload) {
        return { id_token: payload.idToken };
      } else {
        throw new Error("Unexpected payload: " + JSON.stringify(payload));
      }
    } else {
      throw new Error("Expected only one property in payload, got " + JSON.stringify(payload));
    }
  }

  /**
   * Creates credentials that logs in using the [Facebook Provider](https://docs.mongodb.com/realm/authentication/facebook/).
   * @param redirectUrlOrAccessToken The URL that users should be redirected to or the auth code returned from Facebook.
   * @returns The credentials instance, which can be passed to `app.logIn`.
   */
  static facebook<PayloadType extends OAuth2RedirectPayload | FacebookPayload>(
    redirectUrlOrAccessToken: string,
  ): Credentials<PayloadType> {
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
   * @param redirectUrlOrIdToken The URL that users should be redirected to or the id_token returned from Apple.
   * @returns The credentials instance, which can be passed to `app.logIn`.
   */
  static apple<PayloadType extends OAuth2RedirectPayload | ApplePayload>(
    redirectUrlOrIdToken: string,
  ): Credentials<PayloadType> {
    return new Credentials<PayloadType>(
      "oauth2-apple",
      "oauth2-apple",
      redirectUrlOrIdToken.includes("://") ? { redirectUrl: redirectUrlOrIdToken } : { id_token: redirectUrlOrIdToken },
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
  public readonly providerType: ProviderType;

  /**
   * The data being sent to the service when authenticating.
   */
  public readonly payload: PayloadType;

  constructor(name: string, type: "anon-user", payload: AnonymousPayload);
  constructor(name: string, type: "api-key", payload: ApiKeyPayload);
  constructor(name: string, type: "local-userpass", payload: EmailPasswordPayload);
  constructor(name: string, type: "custom-function", payload: FunctionPayload);
  constructor(name: string, type: "custom-token", payload: JWTPayload);
  constructor(name: string, type: "oauth2-google", payload: OAuth2RedirectPayload | GooglePayload);
  constructor(name: string, type: "oauth2-facebook", payload: OAuth2RedirectPayload | FacebookPayload);
  constructor(name: string, type: "oauth2-apple", payload: OAuth2RedirectPayload | ApplePayload);

  /**
   * Constructs an instance of credentials.
   * @param providerName The name of the authentication provider used when authenticating.
   * @param providerType The type of the authentication provider used when authenticating.
   * @param payload The data being sent to the service when authenticating.
   */
  constructor(providerName: string, providerType: ProviderType, payload: PayloadType) {
    this.providerName = providerName;
    this.providerType = providerType;
    this.payload = payload;
  }
}
