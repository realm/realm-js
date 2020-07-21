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

const LOWERCASE_LETTERS = "abcdefghijklmnopqrstuvwxyz";

import { Storage } from "./storage";
import { Credentials, OAuth2RedirectPayload } from "./Credentials";
import {
    generateRandomString,
    encodeQueryString,
    decodeQueryString,
} from "./utils/string";
import { getEnvironment } from "./environment";

type DetermineAppUrl = () => Promise<string>;

export type Window = {
    /**
     * Attempt to close the window.
     */
    close: () => void;

    /**
     * Has the window been closed?
     */
    closed: boolean;
};

type WindowOpener = (url: string) => Window | null;

type RedirectResult = {
    /**
     * The id of the MongoDB Realm app.
     */
    appId: string;

    /**
     * The pseudo-random state which is passed through the OAuth flow.
     */
    state?: string;

    /**
     * Any error that has occurred.
     */
    error?: string;

    /**
     * The serialized combined value containing ids and tokens.
     */
    userAuth?: string;

    /**
     * Was this originally a request to link a user with other credentials?
     */
    link?: string;
};

/* eslint-disable @typescript-eslint/camelcase */
const REDIRECT_HASH_TO_RESULT: { [k: string]: keyof RedirectResult } = {
    _stitch_client_app_id: "appId",
    _baas_client_app_id: "appId",
    _stitch_ua: "userAuth",
    _baas_ua: "userAuth",
    _stitch_link: "link",
    _baas_link: "link",
    _stitch_error: "error",
    _baas_error: "error",
    _stitch_state: "state",
    _baas_state: "state",
};
/* eslint-enable @typescript-eslint/camelcase */

/**
 * A collection of methods helping implement the OAuth2 flow.
 */
export class OAuth2Helper {
    /**
     * Parses the query string from the final step of the OAuth flow.
     *
     * @param queryString The query string passed through in location.hash.
     * @returns The result of the OAuth flow.
     */
    public static parseRedirectLocation(queryString: string): RedirectResult {
        const params = decodeQueryString(queryString);
        const result: Partial<RedirectResult> = {};
        for (const [p, r] of Object.entries(REDIRECT_HASH_TO_RESULT)) {
            const value = params[p];
            if (value) {
                result[r] = value;
            }
        }
        return result as RedirectResult;
    }

    /**
     * Handle the redirect querystring by parsing it and storing it for others to consume.
     *
     * @param queryString The query string containing the encoded result from the OAuth provider.
     * @param storage The underlying storage used to persist the result.
     */
    public static handleRedirect(
        queryString: string,
        storage = getEnvironment().defaultStorage,
    ) {
        const helper = new OAuth2Helper(storage, async () => {
            throw new Error("This instance cannot be used to initiate a flow");
        });
        const result = OAuth2Helper.parseRedirectLocation(queryString);
        helper.handleRedirect(result);
    }

    /**
     * Decodes the authInfo string into its seperate parts.
     *
     * @param authInfo An authInfo string returned from the server.
     * @returns An object containing the separate parts of the authInfo string.
     */
    public static decodeAuthInfo(authInfo: string | undefined) {
        const parts = (authInfo || "").split("$");
        if (parts.length === 4) {
            const [accessToken, refreshToken, userId, deviceId] = parts;
            return { accessToken, refreshToken, userId, deviceId };
        } else {
            throw new Error("Failed to decode 'authInfo' into ids and tokens");
        }
    }

    /**
     * The storage used when storing and retriving secrets.
     */
    private storage: Storage;

    /**
     * A function called to determine the URL of the app.
     * NOTE: This is needed because the URL isn't known synchroniously, as it requires an initial request to the server.
     */
    private getAppUrl: DetermineAppUrl;

    /**
     * The function called to open a window.
     */
    private openWindow: WindowOpener;

    /**
     * Construct a helper implementing the OAuth2 flow.
     *
     * @param storage The underlying storage to use when storing and retriving secrets.
     * @param getAppUrl Call this to determine the app url.
     * @param openWindow An optional function called when a browser window needs to open.
     */
    constructor(
        storage: Storage,
        getAppUrl: DetermineAppUrl,
        openWindow = getEnvironment().openWindow,
    ) {
        this.storage = storage.prefix("oauth2");
        this.getAppUrl = getAppUrl;
        this.openWindow = openWindow;
    }

    /**
     * Initiates the flow by opening a browser window.
     *
     * @param credentials A set of OAuth2 credentials with a redirectUrl in its payload.
     * @returns The secret.
     */
    public async initiate(
        credentials: Credentials<OAuth2RedirectPayload>,
    ): Promise<RedirectResult> {
        // TODO: Implement a timeout and an option to cancel.
        const state = this.generateState();
        const stateStorage = this.getStateStorage(state);
        const url = await this.generateOAuth2Url(credentials, state);
        // Return a promise that resolves when the  gets known
        return new Promise(resolve => {
            let redirectWindow: Window | null = null;
            const handleStorageUpdate = () => {
                // Trying to get the secret from storage
                const result = stateStorage.get("result");
                if (result) {
                    const parsedResult = JSON.parse(result);
                    // The secret got updated!
                    stateStorage.removeListener(handleStorageUpdate);
                    // Clear the storage to prevent others from reading this
                    stateStorage.clear();
                    // Try closing the newly created window
                    try {
                        if (redirectWindow) {
                            redirectWindow.close();
                        }
                    } catch (err) {
                        console.warn(`Failed closing redirect window: ${err}`);
                    } finally {
                        resolve(parsedResult);
                    }
                }
            };
            // Add a listener to the state storage, awaiting an update to the secret
            stateStorage.addListener(handleStorageUpdate);
            // Open up a window
            redirectWindow = this.openWindow(url);
        });
    }

    /**
     * Generate the URL to which the user should be redirected to initiate the OAuth2 flow.
     *
     * @param credentials A set of OAuth2 credentials with a redirectUrl in its payload.
     * @param state A random state, used to track the request throughout the flow, avoiding CSRF attacks.
     * @returns A URL to redirect the user to.
     */
    private async generateOAuth2Url(
        credentials: Credentials<OAuth2RedirectPayload>,
        state: string,
    ) {
        const { redirectUrl } = credentials.payload;
        const appUrl = await this.getAppUrl();
        const qs = encodeQueryString({
            redirect: redirectUrl,
            state,
            // TODO: Add the device information.
        });
        return `${appUrl}/auth/providers/${credentials.providerName}/login?${qs}`;
    }

    /**
     * Handle a redirect.
     *
     * @param result The result from parsing the OAuth 2.0 redirect URL.
     */
    public handleRedirect(result: RedirectResult) {
        const { state, error } = result;
        if (typeof state === "string") {
            const storage = this.getStateStorage(state);
            storage.set("result", JSON.stringify(result));
        } else if (error) {
            throw new Error(`Failed to handle OAuth 2.0 redirect: ${error}`);
        } else {
            throw new Error("Failed to handle OAuth 2.0 redirect.");
        }
    }

    /**
     * Generate a random state string.
     *
     * @returns The random state string.
     */
    private generateState() {
        return generateRandomString(12, LOWERCASE_LETTERS);
    }

    /**
     * Get the storage key associated of an secret associated with a state.
     *
     * @param state The random state.
     * @returns The storage associated with a particular state.
     */
    private getStateStorage(state: string) {
        return this.storage.prefix(`state(${state})`);
    }
}
