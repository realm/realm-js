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

import { useApp, useAuthResult } from "./AppProvider";
import { AuthOperationName, AuthResult } from "./types";
import Realm from "realm";
import { useAuthOperation } from "./useAuthOperation";
import { useCallback } from "react";

interface UseAuth {
  /**
   * Log in with a {@link Realm.Credentials} instance. This allows login with any
   * authentication mechanism supported by Realm.
   * If this is called when a user is currently logged in, it will switch the user.
   */
  logIn(credentials: Realm.Credentials): void;

  /**
   * Log in with the Anonymous authentication provider.
   *
   * @returns A `Realm.User` instance for the logged in user.
   * @see https://www.mongodb.com/docs/atlas/app-services/authentication/anonymous/
   */
  logInWithAnonymous(): void;

  /**
   * Log in with an API key.
   * @see https://www.mongodb.com/docs/atlas/app-services/authentication/api-key/
   */
  logInWithApiKey(key: string): void;

  /**
   * Log in with Email / Password.
   * @see https://www.mongodb.com/docs/atlas/app-services/authentication/email-password/
   */
  logInWithEmailPassword(credentials: { email: string; password: string }): void;

  /**
   * Log in with a JSON Web Token (JWT).
   * @see https://www.mongodb.com/docs/atlas/app-services/authentication/custom-jwt/
   */
  logInWithJWT(token: string): void;

  /**
   * Log in with Google.
   * @see https://www.mongodb.com/docs/atlas/app-services/authentication/google/
   */
  logInWithGoogle(credentials: { idToken: string } | { authCode: string }): void;

  /**
   * Log in with Apple.
   * @see https://www.mongodb.com/docs/atlas/app-services/authentication/apple/
   */
  logInWithApple(idToken: string): void;

  /**
   * Log in with Facebook.
   * @see https://www.mongodb.com/docs/atlas/app-services/authentication/facebook/
   */
  logInWithFacebook(accessToken: string): void;

  /**
   * Log in with a custom function.
   * @see https://www.mongodb.com/docs/atlas/app-services/authentication/custom-function/
   */
  logInWithFunction<PayloadType extends Record<string, unknown>>(payload: PayloadType): void;

  /**
   * Log out the current user.
   */
  logOut(): void;

  /**
   * The {@link AuthResult} of the current (or last) login operation performed
   * for this hook. There is one {@link AuthResult} for all `login`
   * operations within a given `AppProvider` context, as only one login can
   * be in progress at a time (e.g. the {@link AuthResult} of `loginUser` from
   * `useEmailPasswordAuth` is also represented by this).
   */
  result: AuthResult;
}

/**
 * Hook providing operations and corresponding state for authenticating with an
 * Atlas App.
 *
 * The {@link AuthResult} values returned from this hook (e.g. `state`, `pending`, etc.) are
 * shared across all components under a given `AppProvider`, as only one operation can be in
 * progress at a given time (i.e. we will store the values on the context). This means that,
 * for example, multiple components can use the `useAuth` hook to access
 * `loginResult.pending` to render a spinner when login is in progress, without
 * needing to pass that state around or store it somewhere global in their app
 * code.
 *
 * @returns An object containing operations and state for authenticating with an Atlas App.
 */
export function useAuth(): UseAuth {
  const app = useApp();
  const [result] = useAuthResult();

  const logIn = useAuthOperation({
    operation: useCallback((credentials: Realm.Credentials) => app.logIn(credentials), [app]),
    operationName: AuthOperationName.LogIn,
  });

  const logInWithAnonymous = useAuthOperation({
    operation: useCallback(() => app.logIn(Realm.Credentials.anonymous()), [app]),
    operationName: AuthOperationName.LogInWithAnonymous,
  });

  const logInWithApiKey = useAuthOperation({
    operation: useCallback((key: string) => app.logIn(Realm.Credentials.apiKey(key)), [app]),
    operationName: AuthOperationName.LogInWithApiKey,
  });

  const logInWithEmailPassword = useAuthOperation({
    operation: useCallback(
      (params: { email: string; password: string }) =>
        app.logIn(Realm.Credentials.emailPassword(params.email, params.password)),
      [app],
    ),
    operationName: AuthOperationName.LogInWithEmailPassword,
  });

  const logInWithJWT = useAuthOperation({
    operation: useCallback((token: string) => app.logIn(Realm.Credentials.jwt(token)), [app]),
    operationName: AuthOperationName.LogInWithJWT,
  });

  const logInWithGoogle = useAuthOperation({
    operation: useCallback(
      (credentials: { idToken: string } | { authCode: string }) => app.logIn(Realm.Credentials.google(credentials)),
      [app],
    ),
    operationName: AuthOperationName.LogInWithGoogle,
  });

  const logInWithApple = useAuthOperation({
    operation: useCallback((idToken: string) => app.logIn(Realm.Credentials.apple(idToken)), [app]),
    operationName: AuthOperationName.LogInWithApple,
  });

  const logInWithFacebook = useAuthOperation({
    operation: useCallback((accessToken: string) => app.logIn(Realm.Credentials.facebook(accessToken)), [app]),
    operationName: AuthOperationName.LogInWithFacebook,
  });

  const logInWithFunction = useAuthOperation({
    operation: useCallback((payload: Record<string, unknown>) => app.logIn(Realm.Credentials.function(payload)), [app]),
    operationName: AuthOperationName.LogInWithFunction,
  });

  const logOut = useAuthOperation({
    operation: useCallback(async () => app.currentUser?.logOut(), [app]),
    operationName: AuthOperationName.LogOut,
  });

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
