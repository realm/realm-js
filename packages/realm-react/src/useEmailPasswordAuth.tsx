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
import { User } from "realm";
import { Credentials } from "realm";

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
  operation: (...args: Args) => Promise<Result>;
  onSuccess?: (...args: Args) => void;
}) {
  return useCallback<(...args: Args) => ReturnType<typeof operation>>(
    (...args) => {
      if (result.pending) {
        throw new AuthError("Another authentication operation is already in progress");
      }
      setResult({ state: OperationState.Pending, pending: true, success: false, error: undefined });
      return operation(...args)
        .then((result) => {
          setResult({ state: OperationState.Success, pending: false, success: true, error: undefined });
          onSuccess(...args);
          return result;
        })
        .catch((error) => {
          setResult({ state: OperationState.Error, pending: false, success: false, error });
          throw error;
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
    operation: ({ email, password }) => app.logIn(Credentials.emailPassword({ email, password })),
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

  const confirm = useAuthOperation({ result, setResult, operation: app.emailPasswordAuth.confirmUser });

  const resendConfirmationEmail = useAuthOperation({
    result,
    setResult,
    operation: app.emailPasswordAuth.resendConfirmationEmail,
  });

  const retryCustomConfirmation = useAuthOperation({
    result,
    setResult,
    operation: app.emailPasswordAuth.retryCustomConfirmation,
  });

  const sendResetPasswordEmail = useAuthOperation({
    result,
    setResult,
    operation: app.emailPasswordAuth.sendResetPasswordEmail,
  });

  const callResetPasswordFunction = useAuthOperation({
    result,
    setResult,
    operation: ({ email, password }, ...restArgs) =>
      app.emailPasswordAuth.callResetPasswordFunction({ email, password }, ...restArgs),
  });

  const resetPassword = useAuthOperation({ result, setResult, operation: app.emailPasswordAuth.resetPassword });

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
