////////////////////////////////////////////////////////////////////////////
//
// Copyright 2022 Realm Inc.
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

import { App, assert, binding } from "../internal";

/**
 * Types of an authentication provider.
 */
export enum ProviderType {
  AnonUser = "anon-user",
  ApiKey = "api-key",
  LocalUserPass = "local-userpass",
  CustomFunction = "custom-function",
  CustomToken = "custom-token",
  OAuth2Google = "oauth2-google",
  OAuth2Facebook = "oauth2-facebook",
  OAuth2Apple = "oauth2-apple",
}

export function isProviderType(arg: string): arg is ProviderType {
  return Object.values(ProviderType).includes(arg as ProviderType);
}

export class Credentials {
  /** @internal */
  public internal: binding.AppCredentials;

  /** @internal */
  private constructor(internal: binding.AppCredentials) {
    this.internal = internal;
  }

  /**
   * Creates credentials for an anonymous user. These can only be used once - using them a second
   * time will result in a different user being logged in. If you need to get a user that has already logged
   * in with the Anonymous credentials, use {@link App.currentUser} or {@link App.allUsers}.
   * @param reuse Reuse any existing anonymous user already logged in.
   * @return An instance of `Credentials` that can be used in {@link App.logIn}.
   * @see https://docs.mongodb.com/realm/authentication/anonymous/
   */
  static anonymous(reuse = true): Credentials {
    return new Credentials(binding.AppCredentials.anonymous(reuse));
  }

  /**
   * Creates credentials based on a login with an email address and a password.
   * @return {Credentials} An instance of `Credentials` that can be used in {@link App.logIn}.
   * @see https://www.mongodb.com/docs/atlas/app-services/authentication/email-password/
   */
  static emailPassword(credentials: { email: string; password: string }): Credentials;
  static emailPassword(email: string, password: string): Credentials;
  static emailPassword(arg1: { email: string; password: string } | string, password?: string): Credentials {
    if (typeof arg1 === "string") {
      assert.string(password, "password");
      return new Credentials(binding.AppCredentials.usernamePassword(arg1, password));
    } else {
      assert.string(arg1.email, "email");
      assert.string(arg1.password, "password");
      return new Credentials(binding.AppCredentials.usernamePassword(arg1.email, arg1.password));
    }
  }

  /**
   * Creates credentials from an API key.
   * @param key A string identifying the API key.
   * @return An instance of `Credentials` that can be used in {@link App.logIn}.
   * @see https://www.mongodb.com/docs/atlas/app-services/authentication/api-key/
   */
  static apiKey(key: string): Credentials {
    return new Credentials(binding.AppCredentials.apiKey(key));
  }

  /**
   * Creates credentials based on an Apple login.
   * @param token An Apple authentication token, obtained by logging into Apple.
   * @return An instance of `Credentials` that can be used in {@link App.logIn}.
   * @see https://www.mongodb.com/docs/atlas/app-services/authentication/apple/
   */
  static apple(token: string): Credentials {
    return new Credentials(binding.AppCredentials.apple(token));
  }

  /**
   * Creates credentials based on a Facebook login.
   * @param token A Facebook authentication token, obtained by logging into Facebook.
   * @return An instance of `Credentials` that can be used in {@link App.logIn}.
   * @see https://www.mongodb.com/docs/atlas/app-services/authentication/facebook/
   */
  static facebook(token: string): Credentials {
    return new Credentials(binding.AppCredentials.facebook(token));
  }

  /**
   * Creates credentials based on a Google login.
   * @param authObject An object with either an `authCode` or `idToken` property.
   * @return {Credentials} An instance of `Credentials` that can be used in {@link App.logIn}.
   * @see https://www.mongodb.com/docs/atlas/app-services/authentication/google/
   */
  static google(authObject: { authCode: string } | { idToken: string }): Credentials;
  static google({ authCode, idToken }: { authCode?: string; idToken?: string }): Credentials {
    let internal: binding.AppCredentials;
    if (authCode !== undefined) {
      assert(idToken === undefined, "Must not supply both an authCode or idToken field");
      internal = binding.AppCredentials.googleAuth(binding.GoogleAuthCode.make(authCode));
    } else {
      assert(idToken !== undefined, "Must supply either an authCode or idToken field");
      internal = binding.AppCredentials.googleId(binding.GoogleIdToken.make(idToken));
    }
    return new Credentials(internal);
  }

  /**
   * Creates credentials with a JSON Web Token (JWT) provider and user identifier.
   * @param token A string identifying the user. Usually an identity token or a username.
   * @return An instance of `Credentials` that can be used in {@link App.logIn}.
   * @see https://www.mongodb.com/docs/atlas/app-services/authentication/custom-jwt/
   */
  static jwt(token: string): Credentials {
    return new Credentials(binding.AppCredentials.custom(token));
  }

  /**
   * Creates credentials with an Atlas App Services function and user identifier.
   * @param payload An object identifying the user. Usually an identity token or a username.
   * @return An instance of `Credentials` that can be used in {@link App.logIn}.
   * @see https://www.mongodb.com/docs/atlas/app-services/authentication/custom-function/
   */
  static function(payload: object): Credentials {
    return new Credentials(binding.AppCredentials.function(payload as Record<string, binding.EJson>));
  }
}
