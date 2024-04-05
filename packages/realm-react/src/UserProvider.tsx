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

import React, { createContext, useContext, useEffect, useReducer, useState } from "react";
import type Realm from "realm";

import { useApp } from "./AppProvider";

/**
 * Create a context containing the Realm app.  Should be accessed with the useApp hook.
 */
export const UserContext = createContext<Realm.User | null>(null);

type UserProviderProps = {
  /**
   * The fallback component to render if there is no authorized user.  This can be used
   * to render a login screen or another component which will log the user in.
   */
  fallback?: React.ComponentType<unknown> | React.ReactElement | null | undefined;
  children: React.ReactNode;
};

function userWasUpdated(userA: Realm.User | null, userB: Realm.User | null) {
  if (!userA && !userB) {
    return false;
  } else if (userA && userB) {
    return (
      userA.id !== userB.id ||
      userA.state !== userB.state ||
      userA.accessToken !== userB.accessToken ||
      userA.refreshToken !== userB.refreshToken
    );
  } else {
    return true;
  }
}

/**
 * React component providing a Realm user on the context for the sync hooks
 * to use. A `UserProvider` is required for an app to use the hooks.
 */
export const UserProvider: React.FC<UserProviderProps> = ({ fallback: Fallback, children }) => {
  const app = useApp();
  const [user, setUser] = useState<Realm.User | null>(() => app.currentUser);
  const [, forceUpdate] = useReducer((x) => x + 1, 0);

  // Support for a possible change in configuration.
  // Do the check here rather than in a `useEffect()` so as to not render stale state. This allows
  // for the rerender to restart without also having to rerender the children using the stale state.
  const currentUser = app.currentUser;
  if (userWasUpdated(user, currentUser)) {
    setUser(currentUser);
  }

  useEffect(() => {
    app.addListener(forceUpdate);

    return () => app.removeListener(forceUpdate);
  }, [app]);

  useEffect(() => {
    user?.addListener(forceUpdate);

    return () => user?.removeListener(forceUpdate);

    /*
      eslint-disable-next-line react-hooks/exhaustive-deps
      -- We should depend on `user.id` rather than `user` as the ID will indicate a new user in this case.
    */
  }, [user?.id]);

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
