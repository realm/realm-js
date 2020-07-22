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

/**
 * Default base url to prefix all requests if no baseUrl is specified in the configuration.
 */
export const DEFAULT_BASE_URL = "https://stitch.mongodb.com";

/**
 * This base route will be prefixed requests issued through by the base transport.
 */
export const DEFAULT_BASE_PATH = "/api/client/v2.0";

/**
 * Get the URL of the API.
 *
 * @param baseUrl The base URL of the server.
 * @returns The base url concatinated with the base route.
 */
export function api(baseUrl: string) {
    return baseUrl + DEFAULT_BASE_PATH;
}

/**
 * Get the URL of an app.
 *
 * @param baseUrl The base URL of the server.
 * @param appId The id of the app.
 * @returns The URL of the app endpoint.
 */
export function appUrl(baseUrl: string, appId: string) {
    return apiUrl(baseUrl) + `/app/${appId}`;
}

/**
 * Get the URL of an app location.
 *
 * @param baseUrl The base URL of the server.
 * @param appId The id of the app.
 * @returns The URL of the app location endpoint.
 */
export function appLocationUrl(baseUrl: string, appId: string) {
    return appUrl(baseUrl, appId) + "/location";
}

/**
 * Get the URL of the API Key management API.
 *
 * @param baseUrl The base URL of the server.
 * @param appId The id of the app.
 * @returns The API keys endpoint.
 */
export function apiKeyAuthUrl(baseUrl: string, appId: string) {
    return appUrl(baseUrl, appId) + `/auth/api_keys`;
}

/**
 * Get the URL of an authentication provider.
 *
 * @param baseUrl The base URL of the server.
 * @param appId The id of the app.
 * @param providerName The name of the provider.
 * @returns The app url concatinated with the /auth/providers/{providerName}
 */
export function authProviderUrl(
    baseUrl: string,
    appId: string,
    providerName: string,
) {
    return appUrl(baseUrl, appId) + `/auth/providers/${providerName}`;
}

/**
 * Get the URL of an authentication provider.
 *
 * @param baseUrl The base URL of the server.
 * @param appId The id of the app.
 * @param providerName The name of the provider.
 * @returns The app url concatinated with the /auth/providers/{providerName}
 */
export function authProviderLoginUrl(
    baseUrl = DEFAULT_BASE_URL,
    appId: string,
    providerName: string,
) {
    return authProviderUrl(baseUrl, appId, providerName) + "/login";
}
