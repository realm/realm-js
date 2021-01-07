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

import React, {
    createContext,
    PropsWithChildren,
    useContext,
    useMemo,
    useReducer,
} from "react";
import { App, AppConfiguration, Credentials, User } from "realm-web";

type AppContextValue = Pick<
    App,
    | "id"
    | "allUsers"
    | "currentUser"
    | "emailPasswordAuth"
    | "logIn"
    | "switchUser"
    | "removeUser"
>;

/**
 * A context providing a MongoDB Realm App to the component sub-tree.
 */
export const AppContext = createContext<AppContextValue | null>(null);

type AppProviderProps = PropsWithChildren<AppConfiguration>;

/**
 * Provides a MongoDB Realm App to the component sub-tree.
 *
 * @param props The app configuration
 * @returns The children wrapped in a provider.
 */
export function AppProvider({
    id,
    baseUrl,
    app: localApp,
    storage,
    transport,
    children,
}: AppProviderProps) {
    // Compute a memoizezd app instance
    const app = useMemo<App>(() => {
        return new App({ id, app: localApp, baseUrl, storage, transport });
    }, [id, localApp, baseUrl, storage, transport]);
    // Ideally the app would expose a listener pattern, but for now we'll have to rely on exposing a proxy that re-renders calling a forceUpdate function (see https://stackoverflow.com/a/58360674)
    const [, forceUpdate] = useReducer(x => x + 1, 0);
    // Derive a proxy to the app
    // TODO: Update this once the app expose a listener pattern
    const value = useMemo<AppContextValue>(() => {
        return {
            get id() {
                return app.id;
            },
            get currentUser() {
                return app.currentUser;
            },
            get allUsers() {
                return app.allUsers;
            },
            get emailPasswordAuth() {
                return app.emailPasswordAuth;
            },
            async logIn(credentials: Credentials) {
                const user = await app.logIn(credentials);
                forceUpdate();
                return user;
            },
            switchUser(user: User) {
                app.switchUser(user);
                forceUpdate();
            },
            async removeUser(user: User) {
                await app.removeUser(user);
                forceUpdate();
            },
        };
    }, [app, app.currentUser, forceUpdate]);
    // Render the provider with this memoized app instance
    return <AppContext.Provider value={value} children={children} />;
}

/**
 * @returns The app provided by the AppProvider.
 */
export function useApp() {
    const value = useContext(AppContext);
    if (value === null) {
        throw new Error("useApp hook must be rendered under an AppProvider");
    } else {
        return value;
    }
}
