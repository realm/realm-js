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

/**
 * Hook providing operations and corresponding state for authenticating with a
 * Realm app.
 *
 * The {@link AuthResult} states returned from this hook are "global" for all
 * components under a given AppProvider, as only one operation can be in progress
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
   */
  logIn(credentials: Realm.Credentials): Promise<Realm.User | void>;

  /**
   * Log in with the Anonymous authentication provider.
   *
   * @returns A `Realm.User` instance for the logged in user.
   * @see https://www.mongodb.com/docs/atlas/app-services/authentication/anonymous/
   */
  logInWithAnonymous(): Promise<Realm.User | void>;

  /**
   * Log in with an API key.
   *
   * @returns A `Realm.User` instance for the logged in user.
   * @see https://www.mongodb.com/docs/atlas/app-services/authentication/api-key/
   */
  logInWithApiKey(key: string): Promise<Realm.User | void>;

  /**
   * Log in with Email / Password.
   *
   * @returns A `Realm.User` instance for the logged in user.
   * @see https://www.mongodb.com/docs/atlas/app-services/authentication/email-password/
   */
  logInWithEmailPassword(params: { email: string; password: string }): Promise<Realm.User | void>;

  /**
   * Log in with a JSON Web Token (JWT).
   *
   * @returns A `Realm.User` instance for the logged in user.
   * @see https://www.mongodb.com/docs/atlas/app-services/authentication/custom-jwt/
   */
  logInWithJWT(token: string): Promise<Realm.User | void>;

  /**
   * Log in with Google.
   *
   * @returns A `Realm.User` instance for the logged in user.
   * @see https://www.mongodb.com/docs/atlas/app-services/authentication/google/
   */
  logInWithGoogle(params: { idToken: string } | { authCode: string }): Promise<Realm.User | void>;

  /**
   * Log in with Apple.
   *
   * @returns A `Realm.User` instance for the logged in user.
   * @see https://www.mongodb.com/docs/atlas/app-services/authentication/apple/
   */
  logInWithApple(idToken: string): Promise<Realm.User | void>;

  /**
   * Log in with Facebook.
   *
   * @returns A `Realm.User` instance for the logged in user.
   * @see https://www.mongodb.com/docs/atlas/app-services/authentication/facebook/
   */
  logInWithFacebook(accessToken: string): Promise<Realm.User | void>;

  /**
   * Log in with a custom function.
   *
   * @returns A `Realm.User` instance for the logged in user.
   * @see https://www.mongodb.com/docs/atlas/app-services/authentication/custom-function/
   */
  logInWithFunction<PayloadType extends Record<string, unknown>>(payload: PayloadType): Promise<Realm.User | void>;

  /**
   * Log out the current user.
   *
   * @returns A `Realm.User` instance for the logged in user.
   */
  logOut(): Promise<void>;

  /**
   * The {@link AuthResult} of the current (or last) login operation performed
   * for this hook. There is one {@link AuthResult} for all `login`
   * operations within a given `RealmAppProvider` context, as only one login can
   * be in progress at a time (e.g. the {@link AuthResult} of `loginUser` from
   * `useEmailPasswordAuth` is also represented by this).
   */
  result: AuthResult;
}

export function useAuth(): UseAuth {
  const app = useApp();
  const [result] = useAuthResult();

  const logIn = useAuthOperation({
    operation: (credentials: Realm.Credentials) => app.logIn(credentials),
    operationName: AuthOperationName.LogIn,
  });

  const logInWithAnonymous = useAuthOperation({
    operation: () => app.logIn(Realm.Credentials.anonymous),
    operationName: AuthOperationName.LogInWithAnonymous,
  });

  const logInWithApiKey = useAuthOperation({
    operation: (key: string) => app.logIn(Realm.Credentials.apiKey(key)),
    operationName: AuthOperationName.LogInWithApiKey,
  });

  const logInWithEmailPassword = useAuthOperation({
    operation: (params: { email: string; password: string }) =>
      app.logIn(Realm.Credentials.emailPassword(params.email, params.password)),
    operationName: AuthOperationName.LogInWithEmailPassword,
  });

  const logInWithJWT = useAuthOperation({
    operation: (token: string) => app.logIn(Realm.Credentials.jwt(token)),
    operationName: AuthOperationName.LogInWithJWT,
  });

  const logInWithGoogle = useAuthOperation({
    operation: (params: { idToken: string } | { authCode: string }) => app.logIn(Realm.Credentials.google(params)),
    operationName: AuthOperationName.LogInWithGoogle,
  });

  const logInWithApple = useAuthOperation({
    operation: (idToken: string) => app.logIn(Realm.Credentials.apple(idToken)),
    operationName: AuthOperationName.LogInWithApple,
  });

  const logInWithFacebook = useAuthOperation({
    operation: (accessToken: string) => app.logIn(Realm.Credentials.facebook(accessToken)),
    operationName: AuthOperationName.LogInWithFacebook,
  });

  const logInWithFunction = useAuthOperation({
    operation: (payload: Record<string, unknown>) => app.logIn(Realm.Credentials.function(payload)),
    operationName: AuthOperationName.LogInWithFunction,
  });

  const logOut = useAuthOperation({
    operation: () => (app.currentUser ? app.currentUser.logOut() : Promise.resolve()),
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
