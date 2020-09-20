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
import { encodeQueryString, QueryParams } from "./utils/string";
import { DeviceInformation } from "./DeviceInformation";
import { removeKeysWithUndefinedValues } from "./utils/objects";
import { User } from "./User";

const REDIRECT_LOCATION_HEADER = "x-baas-location";

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
        this.oauth2 = new OAuth2Helper(storage);
        this.getDeviceInformation = getDeviceInformation;
    }

    /**
     * @param credentials Credentials to use when logging in.
     * @param linkingUser A user requesting to link.
     */
    public async authenticate(
        credentials: Realm.Credentials<any>,
        linkingUser?: User<object, object>,
    ): Promise<AuthResponse> {
        const isLinking = typeof linkingUser === "object";
        if (
            credentials.providerType.startsWith("oauth2") &&
            typeof credentials.payload.redirectUrl === "string"
        ) {
            // Initiate the OAuth2 flow by generating a state and fetch a redirect URL
            const state = this.oauth2.generateState();
            const url = await this.getLogInUrl(credentials, isLinking, {
                state,
                redirect: credentials.payload.redirectUrl,
                // Ensure redirects are communicated in a header different from "Location" and status remains 200 OK
                providerRedirectHeader: true,
            });
            const response = await this.fetcher.fetch({
                method: "GET",
                url,
                tokenType: isLinking ? "access" : "none",
                user: linkingUser,
            });
            const redirectUrl = response.headers.get(REDIRECT_LOCATION_HEADER);
            // If a response header contains a redirect URL: Open a window and wait for the redirect to be handled
            if (redirectUrl) {
                const redirectResult = await this.oauth2.openWindowAndWaitForRedirect(
                    redirectUrl,
                    state,
                );
                // Decode the auth info (id, tokens, etc.) from the result of the redirect
                return OAuth2Helper.decodeAuthInfo(redirectResult.userAuth);
            } else {
                throw new Error(`Missing ${REDIRECT_LOCATION_HEADER} header`);
            }
        } else {
            const logInUrl = await this.getLogInUrl(credentials, isLinking);
            const response = await this.fetcher.fetchJSON({
                method: "POST",
                url: logInUrl,
                body: credentials.payload,
                tokenType: isLinking ? "access" : "none",
                user: linkingUser,
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

    /**
     * @param credentials Credentials to use when logging in.
     * @param link Should the request link with the current user?
     * @param extraQueryParams Any extra parameters to include in the query string
     */
    public async getLogInUrl(
        credentials: Realm.Credentials<any>,
        link = false,
        extraQueryParams: QueryParams = {},
    ) {
        // See https://github.com/mongodb/stitch-js-sdk/blob/310f0bd5af80f818cdfbc3caf1ae29ffa8e9c7cf/packages/core/sdk/src/auth/internal/CoreStitchAuth.ts#L746-L780
        const appRoute = this.fetcher.appRoute;
        const loginRoute = appRoute
            .authProvider(credentials.providerName)
            .login();
        const deviceInformation = this.getDeviceInformation();
        const qs = encodeQueryString({
            link: link ? "true" : undefined,
            device: deviceInformation.encode(),
            ...extraQueryParams,
        });
        const locationUrl = await this.fetcher.locationUrl;
        return locationUrl + loginRoute.path + qs;
    }
}
