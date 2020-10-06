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
        const deviceInformation = this.getDeviceInformation();
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
                providerRedirectHeader: isLinking ? true : undefined,
                // Add the device information, only if we're not linking - since that request won't have a body of its own.
                device: !isLinking ? deviceInformation.encode() : undefined,
            });

            // If we're linking, we need to send the users access token in the request
            if (isLinking) {
                const response = await this.fetcher.fetch({
                    method: "GET",
                    url,
                    tokenType: isLinking ? "access" : "none",
                    user: linkingUser,
                    // The response will set a cookie that we need to tell the browser to store
                    mode: "cors",
                    credentials: "include",
                });
                // If a response header contains a redirect URL: Open a window and wait for the redirect to be handled
                const redirectUrl = response.headers.get(
                    REDIRECT_LOCATION_HEADER,
                );
                if (redirectUrl) {
                    return this.openWindowAndWaitForAuthResponse(
                        redirectUrl,
                        state,
                    );
                } else {
                    throw new Error(
                        `Missing ${REDIRECT_LOCATION_HEADER} header`,
                    );
                }
            } else {
                // Otherwise we can open a window and let the server redirect the user right away
                // This gives lower latency (as we don't need the client to receive and execute the redirect in code)
                // This also has less dependency on cookies and doesn't sent any tokens.
                return this.openWindowAndWaitForAuthResponse(url, state);
            }
        } else {
            const logInUrl = await this.getLogInUrl(credentials, isLinking);
            const response = await this.fetcher.fetchJSON({
                method: "POST",
                url: logInUrl,
                body: {
                    ...credentials.payload,
                    options: {
                        device: deviceInformation.toJSON(),
                    },
                },
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
    private async getLogInUrl(
        credentials: Realm.Credentials<any>,
        link = false,
        extraQueryParams: Partial<QueryParams> = {},
    ) {
        // See https://github.com/mongodb/stitch-js-sdk/blob/310f0bd5af80f818cdfbc3caf1ae29ffa8e9c7cf/packages/core/sdk/src/auth/internal/CoreStitchAuth.ts#L746-L780
        const appRoute = this.fetcher.appRoute;
        const loginRoute = appRoute
            .authProvider(credentials.providerName)
            .login();
        const qs = encodeQueryString({
            link: link ? "true" : undefined,
            ...extraQueryParams,
        });
        const locationUrl = await this.fetcher.locationUrl;
        return locationUrl + loginRoute.path + qs;
    }

    private async openWindowAndWaitForAuthResponse(
        redirectUrl: string,
        state: string,
    ): Promise<AuthResponse> {
        const redirectResult = await this.oauth2.openWindowAndWaitForRedirect(
            redirectUrl,
            state,
        );
        // Decode the auth info (id, tokens, etc.) from the result of the redirect
        return OAuth2Helper.decodeAuthInfo(redirectResult.userAuth);
    }
}
