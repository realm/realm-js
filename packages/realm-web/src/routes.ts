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
 * @returns The base api route.
 */
function api() {
    return {
        path: "/api/client/v2.0",
        /**
         * @param appId The id of the app.
         * @returns The URL of the app endpoint.
         */
        app(appId: string) {
            return {
                path: this.path + `/app/${appId}`,
                /**
                 * @returns The URL of the app location endpoint.
                 */
                location() {
                    return {
                        path: this.path + "/location",
                    };
                },
                /**
                 * @param providerName The name of the provider.
                 * @returns The app url concatinated with the /auth/providers/{providerName}
                 */
                authProvider(providerName: string) {
                    return {
                        path: this.path + `/auth/providers/${providerName}`,
                        /**
                         * @returns Get the URL of an authentication provider.
                         */
                        login() {
                            return { path: this.path + "/login" };
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
                            return { path: this.path + "/register" };
                        },
                        confirm() {
                            return { path: this.path + "/confirm" };
                        },
                        confirmSend() {
                            return { path: this.path + "/confirm/send" };
                        },
                        reset() {
                            return { path: this.path + "/reset" };
                        },
                        resetSend() {
                            return { path: this.path + "/reset/send" };
                        },
                        resetCall() {
                            return { path: this.path + "/reset/call" };
                        },
                    };
                },
                functionsCall() {
                    return {
                        path: this.path + "/functions/call",
                    };
                },
            };
        },
        auth() {
            return {
                path: this.path + "/auth",
                apiKeys() {
                    return {
                        path: this.path + "/api_keys",
                        key(id: string) {
                            return {
                                path: this.path + `/${id}`,
                                enable() {
                                    return { path: this.path + "/enable" };
                                },
                                disable() {
                                    return { path: this.path + "/disable" };
                                },
                            };
                        },
                    };
                },
                profile() {
                    return { path: this.path + "/profile" };
                },
                session() {
                    return { path: this.path + "/session" };
                },
            };
        },
    };
}

export default { api };
