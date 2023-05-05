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

import { useCallback, useRef, useState } from "react";
import { useApp } from "./AppProvider";
import { AuthError, AuthResult, OperationState } from "./types";
import { useAuth } from "./useAuth";

interface UseEmailPasswordAuth {
  /**
   * Convenience function to login a user with an email and password - users
   * could also call `logIn(Realm.Credentials.emailPassword(email, password)).
   *
   * TODO: Does it make sense to have this convenience function? Should we add
   * convenience functions for other/all auth types if so?
   *
   * @returns A `Realm.User` instance for the logged in user.
   * @throws if another login is already in progress for this `RealmAppProvider`
   * context.
   * @throws if there is an error logging in.
   */
  logIn(args: { email: string; password: string }): Promise<Realm.User>;

  /**
   * Register a new user. By default this will login the newly registered user
   * after they have been successfully registered, unless the
   * `loginAfterRegister` property is `false`.
   *
   * @returns A `Realm.User` instance for the logged in user if
   * `loginAfterRegister` is not `false`, `void` otherwise.
   * @throws if another registration is already in progress for this
   * `RealmAppProvider` context.
   * @throws if there is an error registering the user.
   */
  register(args: {
    email: string;
    password: string;
    // Defaults to true so that a newly registered user is immediately logged
    // in.
    loginAfterRegister?: boolean;
  }): Promise<Realm.User | void>;

  // TODO: verify that the following operations have the same error return type as
  // the ones above (i.e. that `AuthResult` is the correct type for their results).

  /**
   * Confirm a user's account by providing the `token` and `tokenId` received.
   *
   * @returns `void`
   * @throws if another confirmation is already in progress for this
   * `RealmAppProvider` context.
   * @throws if there is an error confirming the user.
   */
  confirm(args: { token: string; tokenId: string }): Promise<void>;

  /**
   * Resend a user's confirmation email.
   *
   * @returns `void`
   * @throws if another confirmation email resend is already in progress for
   * this `RealmAppProvider` context.
   * @throws if there is an error resending the confirmation email.
   */
  resendConfirmationEmail(args: { email: string }): Promise<void>;

  /**
   * Retry the custom confirmation function for a given user.
   *
   * @returns `void`
   * @throws if another custom confirmation retry is already in progress for
   * this `RealmAppProvider` context.
   * @throws if there is an error retrying the custom confirmation.
   */
  retryCustomConfirmation(args: { email: string }): Promise<void>;

  /**
   * Send a password reset email for a given user.
   *
   * @returns `void`
   * @throws if another password reset send is already in progress for this
   * `RealmAppProvider` context.
   * @throws if there is an error sending the password reset.
   */
  sendResetPasswordEmail(args: { email: string }): Promise<void>;

  /**
   * Complete resetting a user's password.
   *
   * @returns `void`
   * @throws if another password reset is already in progress for this
   * `RealmAppProvider` context.
   * @throws if there is an error resetting the password.
   */
  resetPassword(args: { token: string; tokenId: string; password: string }): Promise<void>;

  /**
   * Call the configured password reset function, passing in any additional
   * arguments to the function.
   *
   * @returns `void`
   * @throws if another password reset send is already in progress for this
   * `RealmAppProvider` context.
   * @throws if there is an error sending the password reset.
   */
  callResetPasswordFunction<Args extends unknown[] = []>(
    args: { email: string; password: string },
    ...restArgs: Args
  ): Promise<void>;

  /**
   * Log out the current user.
   *
   * @returns A `Realm.User` instance for the logged in user.
   * @throws if another operation is already in progress for this `useAuth` instance.
   * @throws if there is an error logging out.
   */
  logOut(): Promise<void>;

  /**
   * The {@link AuthResult} of the current (or last) operation performed for
   * this `RealmAppContext`.
   */
  result: AuthResult;
}

export function useEmailPasswordAuth(): UseEmailPasswordAuth {
  const app = useApp();

  const [result, setResult] = useState<AuthResult>({
    state: OperationState.NotStarted,
    pending: false,
    success: false,
    error: undefined,
  });

  const logIn = useCallback(
    ({ email, password }: { email: string; password: string }) => {
      if (result.pending) {
        throw new AuthError("Another Email/Password auth operation is already in progress");
      }
      setResult({ state: OperationState.Pending, pending: true, success: false, error: undefined });
      return app
        .logIn(Realm.Credentials.emailPassword(email, password))
        .then((user) => {
          setResult({ state: OperationState.Success, pending: false, success: true, error: undefined });
          return user;
        })
        .catch((error) => {
          setResult({ state: OperationState.Error, pending: false, success: false, error });
          throw error;
        });
    },
    [app, result.pending],
  );

  const register = useCallback(
    ({
      email,
      password,
      loginAfterRegister = true,
    }: {
      email: string;
      password: string;
      loginAfterRegister?: boolean;
    }) => {
      if (result.pending) {
        throw new AuthError("Another Email/Password auth operation is already in progress");
      }
      setResult({ state: OperationState.Pending, pending: true, success: false, error: undefined });
      return app.emailPasswordAuth
        .registerUser({ email, password })
        .then(() => {
          setResult({ state: OperationState.Success, pending: false, success: true, error: undefined });
          if (loginAfterRegister) {
            return logIn({ email, password });
          }
        })
        .catch((error) => {
          setResult({ state: OperationState.Error, pending: false, success: false, error });
          throw error;
        });
    },
    [logIn, app, result.pending],
  );

  const confirm = useCallback(
    ({ token, tokenId }: { token: string; tokenId: string }) => {
      if (result.pending) {
        throw new AuthError("Another Email/Password auth operation is already in progress");
      }

      setResult({ state: OperationState.Pending, pending: true, success: false, error: undefined });
      return app.emailPasswordAuth
        .confirmUser({ token, tokenId })
        .then((user) => {
          setResult({ state: OperationState.Success, pending: false, success: true, error: undefined });
          return user;
        })
        .catch((error) => {
          setResult({ state: OperationState.Error, pending: false, success: false, error });
          throw error;
        });
    },
    [app, result.pending],
  );

  const resendConfirmationEmail = useCallback(
    ({ email }: { email: string }) => {
      if (result.pending) {
        throw new AuthError("Another Email/Password auth operation is already in progress");
      }

      setResult({
        state: OperationState.Pending,
        pending: true,
        success: false,
        error: undefined,
      });
      return app.emailPasswordAuth
        .resendConfirmationEmail({ email })

        .then(() => {
          setResult({
            state: OperationState.Success,
            pending: false,
            success: true,
            error: undefined,
          });
        })
        .catch((error) => {
          setResult({ state: OperationState.Error, pending: false, success: false, error });
          throw error;
        });
    },
    [app, result.pending],
  );

  const retryCustomConfirmation = useCallback(
    ({ email }: { email: string }) => {
      if (result.pending) {
        throw new AuthError("Another Email/Password auth operation is already in progress");
      }

      setResult({
        state: OperationState.Pending,
        pending: true,
        success: false,
        error: undefined,
      });
      return app.emailPasswordAuth
        .retryCustomConfirmation({ email })
        .then(() => {
          setResult({
            state: OperationState.Success,
            pending: false,
            success: true,
            error: undefined,
          });
        })
        .catch((error) => {
          setResult({ state: OperationState.Error, pending: false, success: false, error });
          throw error;
        });
    },
    [app, result.pending],
  );

  const sendResetPasswordEmail = useCallback(
    ({ email }: { email: string }) => {
      if (result.pending) {
        throw new AuthError("Another Email/Password auth operation is already in progress");
      }

      setResult({
        state: OperationState.Pending,
        pending: true,
        success: false,
        error: undefined,
      });
      return app.emailPasswordAuth
        .sendResetPasswordEmail({ email })
        .then(() => {
          setResult({
            state: OperationState.Success,
            pending: false,
            success: true,
            error: undefined,
          });
        })
        .catch((error) => {
          setResult({ state: OperationState.Error, pending: false, success: false, error });
          throw error;
        });
    },
    [app, result.pending],
  );

  const callResetPasswordFunction = useCallback(
    ({ email, password }: { email: string; password: string }, ...restArgs: unknown[]) => {
      if (result.pending) {
        throw new AuthError("Another Email/Password auth operation is already in progress");
      }

      setResult({
        state: OperationState.Pending,
        pending: true,
        success: false,
        error: undefined,
      });
      return app.emailPasswordAuth
        .callResetPasswordFunction({ email, password }, ...restArgs)
        .then(() => {
          setResult({
            state: OperationState.Success,
            pending: false,
            success: true,
            error: undefined,
          });
        })
        .catch((error) => {
          setResult({ state: OperationState.Error, pending: false, success: false, error });
          throw error;
        });
    },
    [app, result.pending],
  );

  const resetPassword = useCallback(
    ({ password, token, tokenId }: { password: string; token: string; tokenId: string }) => {
      if (result.pending) {
        throw new AuthError("Another Email/Password auth operation is already in progress");
      }

      setResult({ state: OperationState.Pending, pending: true, success: false, error: undefined });
      return app.emailPasswordAuth
        .resetPassword({ password, token, tokenId })

        .then(() => {
          setResult({ state: OperationState.Success, pending: false, success: true, error: undefined });
        })
        .catch((error) => {
          setResult({ state: OperationState.Error, pending: false, success: false, error });
          throw error;
        });
    },
    [app, result.pending],
  );

  const logOut = useCallback(() => {
    if (result.pending) {
      throw new AuthError("Another Email/Password auth operation is already in progress");
    }
    if (!app.currentUser) {
      setResult({ state: OperationState.Success, pending: false, success: true, error: undefined });
      return Promise.resolve();
    }
    setResult({ state: OperationState.Pending, pending: true, success: false, error: undefined });
    return app.currentUser
      ?.logOut()
      .then(() => {
        setResult({ state: OperationState.Success, pending: false, success: true, error: undefined });
      })
      .catch((error) => {
        setResult({ state: OperationState.Error, pending: false, success: false, error });
        throw error;
      });
  }, [app, result.pending]);

  return {
    result,
    logIn,
    register,
    resendConfirmationEmail,
    confirm,
    retryCustomConfirmation,
    sendResetPasswordEmail,
    callResetPasswordFunction,
    resetPassword,
    logOut,
  };
}

// const logOut = useOperation(setResult, result, ({email, password}) => app)

// function useOperation((setResult, result, operation, ...args) => {

// })
