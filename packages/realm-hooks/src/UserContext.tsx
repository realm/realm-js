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

import { ReactComponentLike } from "prop-types";
import React, {
    createContext,
    PropsWithChildren,
    useContext,
    useMemo,
    useReducer,
    ReactNode,
    ComponentType,
} from "react";
import { User } from "realm-web";

import { useApp } from "./AppContext";

type UserContextValue = User;

/**
 * A context providing a MongoDB Realm App to the component sub-tree.
 */
export const UserContext = createContext<UserContextValue | null>(null);

type AppProviderProps = PropsWithChildren<{ fallback: () => JSX.Element }>;

/**
 * Provides a MongoDB Realm App to the component sub-tree.
 *
 * @param props The app configuration
 * @returns The children wrapped in a provider.
 */
export function UserProvider({ fallback, children }: AppProviderProps) {
    // Compute a memoizezd app instance
    const app = useApp();
    const { currentUser } = app;
    if (currentUser) {
        // Render the provider with this memoized app instance
        return <UserContext.Provider value={currentUser} children={children} />;
    } else {
        return fallback();
    }
}

/**
 * @returns The app provided by the AppProvider.
 */
export function useCurrentUser<
    FunctionsFactoryType extends object = Realm.DefaultFunctionsFactory,
    CustomDataType extends object = any
>() {
    const value = useContext(UserContext);
    if (value === null) {
        throw new Error(
            "useCurrentUser hook must be rendered under a UserProvider",
        );
    } else {
        return value as User<FunctionsFactoryType, CustomDataType>;
    }
}
