////////////////////////////////////////////////////////////////////////////
//
// Copyright 2022 Realm Inc.
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

import React, { createContext, useContext, useEffect, useState } from "react";

import { useApp } from "./AppProvider";

/**
 * Create a context containing the Realm app.  Should be accessed with the useApp hook.
 */
export const UserContext = createContext<Realm.User | null>(null);

type UserProviderProps = {
  // Optional fallback component to render when unauthenticated
  fallback?: React.ComponentType<unknown> | React.ReactElement | null | undefined;
  children: React.ReactNode;
};

/**
 * React component providing a Realm user on the context for the sync hooks
 * to use. A `UserProvider` is required for an app to use the hooks.
 */
export const UserProvider: React.FC<UserProviderProps> = ({ fallback: Fallback, children }) => {
  const app = useApp();
  const [user, setUser] = useState<Realm.User | null>(() => app.currentUser);

  // Support for a possible change in configuration
  if (app.currentUser?.id != user?.id) {
    setUser(app.currentUser);
  }

  useEffect(() => {
    const event = () => {
      if (app.currentUser?.id != user?.id) {
        setUser(app.currentUser);
      }
    };
    user?.addListener(event);
    app?.addListener(event);
    return () => {
      user?.removeListener(event);
      app?.removeListener(event);
    };
  }, [user, app]);

  if (!user) {
    if (typeof Fallback === "function") {
      return <Fallback />;
    }
    return <>{Fallback}</>;
  }

  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
};

/**
 * Hook to access the currently authenticated Realm user from the
 * {@link UserProvider} context. The user is stored as React state,
 * so will trigger a re-render whenever it changes (e.g. logging in,
 * logging out, switching user).
 *
 */
export const useUser = <
  FunctionsFactoryType extends Realm.DefaultFunctionsFactory,
  CustomDataType extends Record<string, unknown>,
  UserProfileDataType extends Realm.DefaultUserProfileData,
>(): Realm.User<FunctionsFactoryType, CustomDataType, UserProfileDataType> => {
  const user = useContext(UserContext);

  if (!user) {
    throw new Error("No user found. Did you forget to wrap your component in a <UserProvider>?");
  }

  return user as Realm.User<FunctionsFactoryType, CustomDataType, UserProfileDataType>;
};
