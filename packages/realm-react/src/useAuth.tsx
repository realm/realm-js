////////////////////////////////////////////////////////////////////////////
//
// Copyright 2023 Realm Inc.
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

import { useCallback, useState } from "react";
import { useApp } from "./AppProvider";
import { AuthError, AuthResult, OperationState } from "./types";

/**
 * Hook providing operations and corresponding state for authenticating with a
 * Realm app.
 *
 * The {@link AuthResult} states returned from this hook are "global" for all
 * components under a given RealmAppProvider, as only one operation can be in progress
 * at a given time (i.e. we will store the states on the context). This means that,
 * for example, multiple components can use the `useAuth` hook to access
 * `loginResult.pending` to render a spinner when login is in progress, without
 * needing to pass that state around or store it somewhere global in their app
 * code.
 */
interface UseAuth {
  /**
   * Log in with a {@link Realm.Credentials} instance. This allows login with any
   * authentication mechanism supported by Realm.
   * If this is called when a user is currently logged in, it will switch the user.
   *
   * @returns A `Realm.User` instance for the logged in user.
   * @throws if another operation is already in progress for this `useAuth` instance.
   * @throws if there is an error logging in.
   */
  logIn(credentials: Realm.Credentials): Promise<Realm.User>;

  /**
   * Log in with the Anonymous authentication provider.
   *
   * @returns A `Realm.User` instance for the logged in user.
   * @throws if another operation is already in progress for this `useAuth` instance.
   * @throws if there is an error logging in.
   */
  logInWithAnonymous(): Promise<Realm.User>;

  /**
   * Log in with an API key.
   *
   * @returns A `Realm.User` instance for the logged in user.
   * @throws if another operation is already in progress for this `useAuth` instance.
   * @throws if there is an error logging in.
   */
  logInWithApiKey(key: string): Promise<Realm.User>;

  /**
   * Log in with Email / Password.
   *
   * @returns A `Realm.User` instance for the logged in user.
   * @throws if another operation is already in progress for this `useAuth` instance.
   * @throws if there is an error logging in.
   */
  logInWithEmailPassword(params: { email: string; password: string }): Promise<Realm.User>;

  /**
   * Log in with a JSON Web Token (JWT).
   *
   * @returns A `Realm.User` instance for the logged in user.
   * @throws if another operation is already in progress for this `useAuth` instance.
   * @throws if there is an error logging in.
   */
  logInWithJWT(token: string): Promise<Realm.User>;

  /**
   * Log in with Google.
   *
   * @returns A `Realm.User` instance for the logged in user.
   * @throws if another operation is already in progress for this `useAuth` instance.
   * @throws if there is an error logging in.
   */
  logInWithGoogle(params: { idToken: string } | { authCode: string }): Promise<Realm.User>;

  /**
   * Log in with Apple.
   *
   * @returns A `Realm.User` instance for the logged in user.
   * @throws if another operation is already in progress for this `useAuth` instance.
   * @throws if there is an error logging in.
   */
  logInWithApple(idToken: string): Promise<Realm.User>;

  /**
   * Log in with Facebook.
   *
   * @returns A `Realm.User` instance for the logged in user.
   * @throws if another operation is already in progress for this `useAuth` instance.
   * @throws if there is an error logging in.
   */
  logInWithFacebook(accessToken: string): Promise<Realm.User>;

  /**
   * Log in with a custom function.
   *
   * @returns A `Realm.User` instance for the logged in user.
   * @throws if another operation is already in progress for this `useAuth` instance.
   * @throws if there is an error logging in.
   */
  logInWithFunction<PayloadType extends Record<string, unknown>>(payload: PayloadType): Promise<Realm.User>;

  /**
   * Log out the current user.
   *
   * @returns A `Realm.User` instance for the logged in user.
   * @throws if another operation is already in progress for this `useAuth` instance.
   * @throws if there is an error logging out.
   */
  logOut(): Promise<void>;

  /**
   * The {@link AuthResult} of the current (or last) login operation performed
   * for this `RealmAppContext`. There is one {@link AuthResult} for all `login`
   * operations within a given `RealmAppProvider` context, as only one login can
   * be in progress at a time (e.g. the {@link AuthResult} of `loginUser` from
   * `useEmailPasswordAuth` is also represented by this).
   */
  result: AuthResult;
}

export function useAuth(): UseAuth {
  const app = useApp();
  const [result, setResult] = useState<AuthResult>({
    state: OperationState.NotStarted,
    pending: false,
    success: false,
    error: undefined,
  });

  const logIn = useCallback(
    (credentials: Realm.Credentials): Promise<Realm.User> => {
      if (result.state === OperationState.Pending) {
        throw new AuthError("Another login is already in progress.");
      }
      setResult({ state: OperationState.Pending, pending: true, success: false, error: undefined });
      return app.logIn(credentials).then(
        (user) => {
          setResult({ state: OperationState.Success, pending: false, success: true, error: undefined });
          return user;
        },
        (error) => {
          const authError = new AuthError(error);
          setResult({ state: OperationState.Error, pending: false, success: false, error: authError });
          throw authError;
        },
      );
    },
    [app],
  );

  const logInWithAnonymous = useCallback(() => {
    return logIn(Realm.Credentials.anonymous());
  }, [logIn]);

  const logInWithApiKey = useCallback(
    (key: string) => {
      return logIn(Realm.Credentials.apiKey(key));
    },
    [logIn],
  );

  const logInWithEmailPassword = useCallback(
    (params: { email: string; password: string }) => {
      return logIn(Realm.Credentials.emailPassword(params.email, params.password));
    },
    [logIn],
  );

  const logInWithJWT = useCallback(
    (token: string) => {
      return logIn(Realm.Credentials.jwt(token));
    },
    [logIn],
  );

  const logInWithGoogle = useCallback(
    (params: { idToken: string } | { authCode: string }) => {
      return logIn(Realm.Credentials.google(params));
    },
    [logIn],
  );

  const logInWithApple = useCallback(
    (idToken: string) => {
      return logIn(Realm.Credentials.apple(idToken));
    },
    [logIn],
  );

  const logInWithFacebook = useCallback(
    (accessToken: string) => {
      return logIn(Realm.Credentials.facebook(accessToken));
    },
    [logIn],
  );

  const logInWithFunction = useCallback(
    (payload: Record<string, unknown>) => {
      return logIn(Realm.Credentials.function(payload));
    },
    [logIn],
  );

  const logOut = useCallback(() => {
    return app.currentUser?.logOut() || Promise.resolve();
  }, [app]);

  return {
    result,
    logIn,
    logInWithAnonymous,
    logInWithApiKey,
    logInWithEmailPassword,
    logInWithJWT,
    logInWithGoogle,
    logInWithApple,
    logInWithFacebook,
    logInWithFunction,
    logOut,
  };
}
