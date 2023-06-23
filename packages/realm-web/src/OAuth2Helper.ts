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
import { generateRandomString, decodeQueryString } from "./utils/string";
import { getEnvironment } from "./environment";

const CLOSE_CHECK_INTERVAL = 100; // 10 times per second

/**
 * Simplified handle to a browser window.
 */
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
   * The id of the Atlas App Services application.
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

/**
 * A collection of methods helping implement the OAuth2 flow.
 */
export class OAuth2Helper {
  /**
   * Parses the query string from the final step of the OAuth flow.
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
   * @param queryString The query string containing the encoded result from the OAuth provider.
   * @param storage The underlying storage used to persist the result.
   */
  public static handleRedirect(queryString: string, storage = getEnvironment().defaultStorage): void {
    const result = OAuth2Helper.parseRedirectLocation(queryString);
    const { state, error } = result;
    if (typeof state === "string") {
      const oauth2Storage = storage.prefix("oauth2");
      const stateStorage = OAuth2Helper.getStateStorage(oauth2Storage, state);
      stateStorage.set("result", JSON.stringify(result));
    } else if (error) {
      throw new Error(`Failed to handle OAuth 2.0 redirect: ${error}`);
    } else {
      throw new Error("Failed to handle OAuth 2.0 redirect.");
    }
  }

  /**
   * Decodes the authInfo string into its seperate parts.
   * @param authInfo An authInfo string returned from the server.
   * @returns An object containing the separate parts of the authInfo string.
   */
  public static decodeAuthInfo(authInfo: string | undefined): Record<string, unknown> {
    const parts = (authInfo || "").split("$");
    if (parts.length === 4) {
      const [accessToken, refreshToken, userId, deviceId] = parts;
      return { accessToken, refreshToken, userId, deviceId };
    } else {
      throw new Error("Failed to decode 'authInfo' into ids and tokens");
    }
  }

  /**
   * Get the storage key associated of an secret associated with a state.
   * @param storage The root storage used to derive a "state namespaced" storage.
   * @param state The random state.
   * @returns The storage associated with a particular state.
   */
  private static getStateStorage(storage: Storage, state: string) {
    return storage.prefix(`state(${state})`);
  }

  /**
   * The storage used when storing and retriving secrets.
   */
  private storage: Storage;

  /**
   * The function called to open a window.
   */
  private openWindow: WindowOpener;

  /**
   * @param storage The underlying storage to use when storing and retriving secrets.
   * @param openWindow An optional function called when a browser window needs to open.
   */
  constructor(storage: Storage, openWindow = getEnvironment().openWindow) {
    this.storage = storage.prefix("oauth2");
    this.openWindow = openWindow;
  }

  /**
   * Open a window and wait for the redirect to be handled.
   * @param url The URL to open.
   * @param state The state which will be used to listen for storage updates.
   * @returns The result passed through the redirect.
   */
  public openWindowAndWaitForRedirect(url: string, state: string): Promise<RedirectResult> {
    const stateStorage = OAuth2Helper.getStateStorage(this.storage, state);
    // Return a promise that resolves when the  gets known
    return new Promise((resolve, reject) => {
      let redirectWindow: Window | null = null;
      // We're declaring the interval now to enable referencing before its initialized
      let windowClosedInterval: TimerHandle; // eslint-disable-line prefer-const

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
              // Stop checking if the window closed
              clearInterval(windowClosedInterval);
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
      // Not using a const, because we need the two listeners to reference each other when removing the other.
      windowClosedInterval = setInterval(() => {
        // Polling "closed" because registering listeners on the window violates cross-origin policies
        if (!redirectWindow) {
          // No need to keep polling for a window that we can't check
          clearInterval(windowClosedInterval);
        } else if (redirectWindow.closed) {
          // Stop polling the window state
          clearInterval(windowClosedInterval);
          // Stop listening for changes to the storage
          stateStorage.removeListener(handleStorageUpdate);
          // Reject the promise
          const err = new Error("Window closed");
          reject(err);
        }
      }, CLOSE_CHECK_INTERVAL);
    });
  }

  /**
   * Generate a random state string.
   * @returns The random state string.
   */
  public generateState(): string {
    return generateRandomString(12, LOWERCASE_LETTERS);
  }
}
