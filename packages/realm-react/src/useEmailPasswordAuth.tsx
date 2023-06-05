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

import { useCallback, useEffect, useState } from "react";
import { useApp } from "./AppProvider";
import { AuthError, AuthResult, OperationState } from "./types";
import { Realm, App, Object, User, Credentials } from "realm";

interface UseEmailPasswordAuth {
  /**
   * Convenience function to login a user with an email and password - users
   * could also call `logIn(Realm.Credentials.emailPassword(email, password)).
   *
   * TODO: Does it make sense to have this convenience function? Should we add
   * convenience functions for other/all auth types if so?
   *
   * @returns A `Realm.User` instance for the logged in user.
   */
  logIn(args: { email: string; password: string }): Promise<Realm.User | void>;

  /**
   * Register a new user. By default this will login the newly registered user
   * after they have been successfully registered, unless the
   * `loginAfterRegister` property is `false`.
   *
   * @returns A `Realm.User` instance for the logged in user if
   * `loginAfterRegister` is not `false`, `void` otherwise.
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
   */
  confirm(args: { token: string; tokenId: string }): Promise<void>;

  /**
   * Resend a user's confirmation email.
   *
   * @returns `void`
   */
  resendConfirmationEmail(args: { email: string }): Promise<void>;

  /**
   * Retry the custom confirmation function for a given user.
   *
   * @returns `void`
   */
  retryCustomConfirmation(args: { email: string }): Promise<void>;

  /**
   * Send a password reset email for a given user.
   *
   * @returns `void`
   */
  sendResetPasswordEmail(args: { email: string }): Promise<void>;

  /**
   * Complete resetting a user's password.
   *
   * @returns `void`
   */
  resetPassword(args: { token: string; tokenId: string; password: string }): Promise<void>;

  /**
   * Call the configured password reset function, passing in any additional
   * arguments to the function.
   *
   * @returns `void`
   */
  callResetPasswordFunction<Args extends unknown[] = []>(
    args: {
      email: string;
      password: string;
    },
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

function useAuthOperation<Args extends unknown[], Result>({
  result,
  setResult,
  operation,
  onSuccess = () => undefined,
}: {
  result: AuthResult;
  setResult: (value: React.SetStateAction<AuthResult>) => void;
  operation: (...args: Args) => Promise<Result | void>;
  onSuccess?: (...args: Args) => void;
}) {
  return useCallback<(...args: Args) => ReturnType<typeof operation>>(
    (...args) => {
      if (result.pending) {
        return Promise.reject("Another authentication operation is already in progress");
      }

      setResult({ state: OperationState.Pending, pending: true, success: false, error: undefined });
      return operation(...args)
        .then((res) => {
          setResult({ state: OperationState.Success, pending: false, success: true, error: undefined });
          onSuccess(...args);
          return res;
        })
        .catch((error) => {
          const authError = new AuthError(error);
          setResult({ state: OperationState.Error, pending: false, success: false, error: authError });
        });
    },
    [result, setResult, operation, onSuccess],
  );
}

export function useEmailPasswordAuth(): UseEmailPasswordAuth {
  const app = useApp();

  const [result, setResult] = useState<AuthResult>({
    state: OperationState.NotStarted,
    pending: false,
    success: false,
    error: undefined,
  });

  const logIn = useAuthOperation<[{ email: string; password: string }], User>({
    result,
    setResult,
    operation: (args) => app.logIn(Credentials.emailPassword(args)),
  });

  const register = useAuthOperation<[{ email: string; password: string; loginAfterRegister?: boolean }], void>({
    result,
    setResult,
    operation: ({ email, password }) => app.emailPasswordAuth.registerUser({ email, password }),
    onSuccess: ({ email, password, loginAfterRegister = true }) => {
      if (loginAfterRegister === true) {
        return logIn({ email, password });
      }
    },
  });

  const confirm = useAuthOperation({
    result,
    setResult,
    operation: ({ token, tokenId }) => app.emailPasswordAuth.confirmUser({ token, tokenId }),
  });

  const resendConfirmationEmail = useAuthOperation({
    result,
    setResult,
    operation: ({ email }) => app.emailPasswordAuth.resendConfirmationEmail({ email }),
  });

  const retryCustomConfirmation = useAuthOperation({
    result,
    setResult,
    operation: ({ email }) => app.emailPasswordAuth.retryCustomConfirmation({ email }),
  });

  const sendResetPasswordEmail = useAuthOperation({
    result,
    setResult,
    operation: ({ email }) => app.emailPasswordAuth.sendResetPasswordEmail({ email }),
  });

  const callResetPasswordFunction = useAuthOperation({
    result,
    setResult,
    operation: ({ email, password }, ...restArgs) =>
      app.emailPasswordAuth.callResetPasswordFunction({ email, password }, ...restArgs),
  });

  const resetPassword = useAuthOperation({
    result,
    setResult,
    operation: ({ password, token, tokenId }) => app.emailPasswordAuth.resetPassword({ password, token, tokenId }),
  });

  const logOut = useAuthOperation({
    result,
    setResult,
    operation: () => (app.currentUser ? app.currentUser.logOut() : Promise.resolve()),
  });

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
