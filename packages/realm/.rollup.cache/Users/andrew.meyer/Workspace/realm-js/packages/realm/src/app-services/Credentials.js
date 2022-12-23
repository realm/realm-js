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
import { assert, binding } from "../internal";
/**
 * Types of an authentication provider.
 */
export var ProviderType;
(function (ProviderType) {
    ProviderType["AnonUser"] = "anon-user";
    ProviderType["ApiKey"] = "api-key";
    ProviderType["LocalUserPass"] = "local-userpass";
    ProviderType["CustomFunction"] = "custom-function";
    ProviderType["CustomToken"] = "custom-token";
    ProviderType["OAuth2Google"] = "oauth2-google";
    ProviderType["OAuth2Facebook"] = "oauth2-facebook";
    ProviderType["OAuth2Apple"] = "oauth2-apple";
})(ProviderType || (ProviderType = {}));
export function isProviderType(arg) {
    return Object.values(ProviderType).includes(arg);
}
export class Credentials {
    /** @internal */
    internal;
    /** @internal */
    constructor(internal) {
        this.internal = internal;
    }
    /**
     * Creates credentials for an anonymous user. These can only be used once - using them a second
     * time will result in a different user being logged in. If you need to get a user that has already logged
     * in with the Anonymous credentials, use {@linkcode App.currentUser} or {@linkcode App.allUsers}.
     * @param reuse Reuse any existing anonymous user already logged in.
     * @return {Credentials} An instance of `Credentials` that can be used in {@linkcode App.logIn}.
     */
    static anonymous(reuse = true) {
        return new Credentials(binding.AppCredentials.anonymous(reuse));
    }
    static emailPassword(arg1, password) {
        if (typeof arg1 === "string") {
            assert.string(password, "password");
            return new Credentials(binding.AppCredentials.usernamePassword(arg1, password));
        }
        else {
            assert.string(arg1.email, "email");
            assert.string(arg1.password, "password");
            return new Credentials(binding.AppCredentials.usernamePassword(arg1.email, arg1.password));
        }
    }
    /**
     * Creates credentials from an API key.
     * @param key A string identifying the API key.
     * @return {Credentials} An instance of `Credentials` that can be used in {@linkcode Realm.App.logIn}.
     */
    static apiKey(key) {
        return new Credentials(binding.AppCredentials.userApiKey(key));
    }
    /**
     * Creates credentials based on an Apple login.
     * @param token An Apple authentication token, obtained by logging into Apple.
     * @return {Credentials} An instance of `Credentials` that can be used in {@linkcode Realm.App.logIn}.
     */
    static apple(token) {
        return new Credentials(binding.AppCredentials.apple(token));
    }
    /**
     * Creates credentials based on a Facebook login.
     * @param token A Facebook authentication token, obtained by logging into Facebook.
     * @return {Credentials} An instance of `Credentials` that can be used in {@linkcode Realm.App.logIn}.
     */
    static facebook(token) {
        return new Credentials(binding.AppCredentials.facebook(token));
    }
    /**
     * Creates credentials based on a Google login.
     * @param authObject An object with either an `authCode` or `idToken` property.
     * @return {Credentials} An instance of `Credentials` that can be used in {@linkcode Realm.App.logIn}.
     */
    static google(authObject) {
        return new Credentials(binding.AppCredentials.googleAuth(authObject));
    }
    /**
     * Creates credentials with a JSON Web Token (JWT) provider and user identifier.
     * @param token A string identifying the user. Usually an identity token or a username.
     * @return {Credentials} An instance of `Credentials` that can be used in {@linkcode Realm.App.logIn}.
     */
    static jwt(token) {
        return new Credentials(binding.AppCredentials.custom(token));
    }
    /**
     * Creates credentials with an Atlas App Services function and user identifier.
     * @param payload An object identifying the user. Usually an identity token or a username.
     * @return {Credentials} An instance of `Credentials` that can be used in {@linkcode Realm.App.logIn}.
     */
    static function(payload) {
        return new Credentials(binding.AppCredentials.function(payload));
    }
}
//# sourceMappingURL=Credentials.js.map