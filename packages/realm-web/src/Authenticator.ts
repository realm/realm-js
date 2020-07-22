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

import { BaseTransport, AppTransport } from "./transports";
import { Storage } from "./storage";
import { OAuth2Helper } from "./OAuth2Helper";

export type AuthResponse = {
    /**
     * The id of the user.
     */
    userId: string;
    /**
     * The short-living access token.
     */
    accessToken: string;
    /**
     * The refresh token for the session.
     */
    refreshToken: string;
};

type App = {
    /** The id of the app. */
    id: string;
    /** The base transport of the app. */
    baseTransport: BaseTransport;
    /** The app transport of the app. */
    appTransport: AppTransport;
};

/**
 * Handles authentication and linking of users.
 */
export class Authenticator {
    /**
     * A helper used to complete an OAuth 2.0 authentication flow.
     */
    private oauth2: OAuth2Helper;

    /**
     * A transport adding the base route prefix to all requests.
     */
    public readonly baseTransport: BaseTransport;

    /**
     * Constructs the Authenticator.
     *
     * @param appId The id of the app.
     * @param storage The storage used when completing OAuth 2.0 flows (should not be scoped to a specific app).
     * @param baseTransport The transport to use when issuing requests.
     */
    constructor(appId: string, storage: Storage, baseTransport: BaseTransport) {
        this.baseTransport = baseTransport;
        this.oauth2 = new OAuth2Helper(storage, async () => {
            const baseUrl = await this.baseTransport.determineBaseUrl(false);
            return `${baseUrl}/app/${appId}`;
        });
    }

    /**
     * Perform the login, based on the credentials.
     *
     * @param credentials Credentials to use when logging in.
     * @param link Should the request link with the current user?
     */
    public async authenticate(
        credentials: Realm.Credentials<any>,
        link = false,
    ): Promise<AuthResponse> {
        if (
            credentials.providerType.startsWith("oauth2") &&
            typeof credentials.payload.redirectUrl === "string"
        ) {
            // Initiate the OAuth2 and use the next credentials once they're known
            const result = await this.oauth2.initiate(credentials);
            return OAuth2Helper.decodeAuthInfo(result.userAuth);
        } else {
            return this.performLogIn(this, credentials);
        }
    }

    /**
     * Perform the actual login.
     *
     * @param app
     * @param credentials
     */
    private async performLogIn(credentials: Credentials) {
        // See https://github.com/mongodb/stitch-js-sdk/blob/310f0bd5af80f818cdfbc3caf1ae29ffa8e9c7cf/packages/core/sdk/src/auth/internal/CoreStitchAuth.ts#L746-L780
        const url = 
        const response = await app.appTransport.fetch<object, any>({
            method: "POST",
            path: `/auth/providers/${credentials.providerName}/login`,
            body: credentials.payload,
        });
        // Spread out values from the response and ensure they're valid
        const {
            user_id: userId,
            access_token: accessToken,
            refresh_token: refreshToken,
        } = response;
        if (typeof userId !== "string") {
            throw new Error("Expected a user id in the response");
        }
        if (typeof accessToken !== "string") {
            throw new Error("Expected an access token in the response");
        }
        if (typeof refreshToken !== "string") {
            throw new Error("Expected a refresh token in the response");
        }
        return { userId, accessToken, refreshToken };
    }
}
