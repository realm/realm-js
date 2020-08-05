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

import { Fetcher } from "./Fetcher";
import { Storage } from "./storage";
import { OAuth2Helper } from "./OAuth2Helper";

// TODO: Add the deviceId to the auth response.

/**
 * The response from an authentication request.
 */
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
    refreshToken: string | null;
};

/**
 * Handles authentication and linking of users.
 */
export class Authenticator {
    private readonly fetcher: Fetcher;
    private oauth2: OAuth2Helper;

    /**
     * @param fetcher The fetcher used to fetch responses from the server.
     * @param storage The storage used when completing OAuth 2.0 flows (should not be scoped to a specific app).
     */
    constructor(fetcher: Fetcher, storage: Storage) {
        this.fetcher = fetcher;
        this.oauth2 = new OAuth2Helper(storage, () =>
            fetcher
                .getLocationUrl()
                .then(url => url + this.fetcher.getAppPath().path),
        );
    }

    /**
     * @param credentials Credentials to use when logging in.
     * @param link Should the request link with the current user?
     */
    public async authenticate(
        credentials: Realm.Credentials<any>,
        link = false,
    ): Promise<AuthResponse> {
        if (link) {
            throw new Error("Linking accounts are not yet implemented");
        }

        if (
            credentials.providerType.startsWith("oauth2") &&
            typeof credentials.payload.redirectUrl === "string"
        ) {
            // Initiate the OAuth2 and use the next credentials once they're known
            const result = await this.oauth2.initiate(credentials);
            return OAuth2Helper.decodeAuthInfo(result.userAuth);
        } else {
            // See https://github.com/mongodb/stitch-js-sdk/blob/310f0bd5af80f818cdfbc3caf1ae29ffa8e9c7cf/packages/core/sdk/src/auth/internal/CoreStitchAuth.ts#L746-L780
            const appPath = this.fetcher.getAppPath();
            const response = await this.fetcher.fetchJSON<object, any>({
                method: "POST",
                path: appPath.authProvider(credentials.providerName).login()
                    .path,
                body: credentials.payload,
                tokenType: "none",
            });
            // Spread out values from the response and ensure they're valid
            const {
                user_id: userId,
                access_token: accessToken,
                refresh_token: refreshToken = null,
            } = response;
            if (typeof userId !== "string") {
                throw new Error("Expected a user id in the response");
            }
            if (typeof accessToken !== "string") {
                throw new Error("Expected an access token in the response");
            }
            return { userId, accessToken, refreshToken };
        }
    }
}
