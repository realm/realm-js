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
import { encodeQueryString } from "./utils/string";
import { DeviceInformation } from "./DeviceInformation";
import { removeKeysWithUndefinedValues } from "./utils/objects";

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
    /**
     * The id of the device recognized by the server.
     */
    deviceId: string;
};

type DeviceInformationGetter = () => DeviceInformation;

/**
 * Handles authentication and linking of users.
 */
export class Authenticator {
    private readonly fetcher: Fetcher;
    private readonly oauth2: OAuth2Helper;
    private readonly getDeviceInformation: DeviceInformationGetter;

    /**
     * @param fetcher The fetcher used to fetch responses from the server.
     * @param storage The storage used when completing OAuth 2.0 flows (should not be scoped to a specific app).
     * @param getDeviceInformation Called to get device information to be sent to the server.
     */
    constructor(
        fetcher: Fetcher,
        storage: Storage,
        getDeviceInformation: DeviceInformationGetter,
    ) {
        this.fetcher = fetcher;
        this.oauth2 = new OAuth2Helper(storage, () => fetcher.appUrl);
        this.getDeviceInformation = getDeviceInformation;
    }

    /**
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
            // See https://github.com/mongodb/stitch-js-sdk/blob/310f0bd5af80f818cdfbc3caf1ae29ffa8e9c7cf/packages/core/sdk/src/auth/internal/CoreStitchAuth.ts#L746-L780
            const appRoute = this.fetcher.appRoute;
            const loginRoute = appRoute
                .authProvider(credentials.providerName)
                .login();
            const deviceInformation = this.getDeviceInformation();
            const qs = encodeQueryString({
                link: link ? "true" : undefined,
                device: deviceInformation.encode(),
            });
            const path = loginRoute.path + qs;
            const response = await this.fetcher.fetchJSON({
                method: "POST",
                path,
                body: credentials.payload,
                tokenType: link ? "access" : "none",
            });
            // Spread out values from the response and ensure they're valid
            const {
                user_id: userId,
                access_token: accessToken,
                refresh_token: refreshToken = null,
                device_id: deviceId,
            } = response;
            if (typeof userId !== "string") {
                throw new Error("Expected a user id in the response");
            }
            if (typeof accessToken !== "string") {
                throw new Error("Expected an access token in the response");
            }
            return { userId, accessToken, refreshToken, deviceId };
        }
    }
}
