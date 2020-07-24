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
 * @param baseUrl The base URL of the server.
 * @returns The base url concatinated with the base route.
 */
function api(baseUrl: string) {
    return {
        url: baseUrl + "/api/client/v2.0",
        /**
         * @param appId The id of the app.
         * @returns The URL of the app endpoint.
         */
        app(appId: string) {
            return {
                url: this.url + `/app/${appId}`,
                /**
                 * @returns The URL of the app location endpoint.
                 */
                location() {
                    return {
                        url: this.url + "/location",
                    };
                },
                /**
                 * @param providerName The name of the provider.
                 * @returns The app url concatinated with the /auth/providers/{providerName}
                 */
                authProvider(providerName: string) {
                    return {
                        url: this.url + `/auth/providers/${providerName}`,
                        /**
                         * @returns Get the URL of an authentication provider.
                         */
                        login() {
                            return { url: this.url + "/login" };
                        },
                    };
                },
                /**
                 * @param providerName The name of the provider.
                 * @returns The app url concatinated with the /auth/providers/{providerName}
                 */
                emailPasswordAuth(providerName: string) {
                    const authProviderRoutes = this.authProvider(providerName);
                    return {
                        ...authProviderRoutes,
                        register() {
                            return { url: this.url + "/register" };
                        },
                        confirm() {
                            return { url: this.url + "/confirm" };
                        },
                        confirmSend() {
                            return { url: this.url + "/confirm/send" };
                        },
                        reset() {
                            return { url: this.url + "/reset" };
                        },
                        resetSend() {
                            return { url: this.url + "/reset/send" };
                        },
                        resetCall() {
                            return { url: this.url + "/reset/call" };
                        },
                    };
                },
                functionsCall() {
                    return {
                        url: this.url + "/functions/call",
                    };
                },
            };
        },
        auth() {
            return {
                url: this.url + "/auth",
                apiKeys() {
                    return {
                        url: this.url + "/api_keys",
                        key(id: string) {
                            return {
                                url: this.url + `/${id}`,
                                enable() {
                                    return { url: this.url + "/enable" };
                                },
                                disable() {
                                    return { url: this.url + "/disable" };
                                },
                            };
                        },
                    };
                },
                profile() {
                    return { url: this.url + "/profile" };
                },
                session() {
                    return { url: this.url + "/session" };
                },
            };
        },
    };
}

export default { api };
