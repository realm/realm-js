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
import { Realm, User, Credentials } from "realm";
import { useAuthOperation } from "./useAuthOperation";

/**
 * Hook providing operations and corresponding state for authenticating with a
 * Realm app with Email/Password.  It also contains operations related to
 * Email/Password authentication, such as resetting password and confirming a user.
 *
 * The {@link AuthResult} states returned from this hook are "global" for all
 * components under a given AppProvider, as only one operation can be in progress
 * at a given time (i.e. we will store the states on the context). This means that,
 * for example, multiple components can use the `useAuth` hook to access
 * `result.pending` to render a spinner when login is in progress, without
 * needing to pass that state around or store it somewhere global in their app
 * code.
 */
interface UseEmailPasswordAuth {
  /**
   * Convenience function to login a user with an email and password - users
   * could also call `logIn(Realm.Credentials.emailPassword(email, password)).
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
   */
  logOut(): Promise<void>;

  /**
   * The {@link AuthResult} of the current (or last) operation performed for
   * this hook.
   */
  result: AuthResult;
}

export function useEmailPasswordAuth(): UseEmailPasswordAuth {
  const app = useApp();
  const [result] = useAuthResult();

  const logIn = useAuthOperation<[{ email: string; password: string }], User>({
    operation: (args) => app.logIn(Credentials.emailPassword(args)),
    operationName: AuthOperationName.LogIn,
  });

  const register = useAuthOperation<[{ email: string; password: string; loginAfterRegister?: boolean }], void>({
    operation: ({ email, password }) => app.emailPasswordAuth.registerUser({ email, password }),
    operationName: AuthOperationName.Register,
    onSuccess: ({ email, password, loginAfterRegister = true }) => {
      if (loginAfterRegister === true) {
        return logIn({ email, password });
      }
    },
  });

  const confirm = useAuthOperation({
    operation: ({ token, tokenId }) => app.emailPasswordAuth.confirmUser({ token, tokenId }),
    operationName: AuthOperationName.Confirm,
  });

  const resendConfirmationEmail = useAuthOperation({
    operation: ({ email }) => app.emailPasswordAuth.resendConfirmationEmail({ email }),
    operationName: AuthOperationName.ResendConfirmationEmail,
  });

  const retryCustomConfirmation = useAuthOperation({
    operation: ({ email }) => app.emailPasswordAuth.retryCustomConfirmation({ email }),
    operationName: AuthOperationName.RetryCustomConfirmation,
  });

  const sendResetPasswordEmail = useAuthOperation({
    operation: ({ email }) => app.emailPasswordAuth.sendResetPasswordEmail({ email }),
    operationName: AuthOperationName.SendResetPasswordEmail,
  });

  const callResetPasswordFunction = useAuthOperation({
    operation: ({ email, password }, ...restArgs) =>
      app.emailPasswordAuth.callResetPasswordFunction({ email, password }, ...restArgs),
    operationName: AuthOperationName.CallResetPasswordFunction,
  });

  const resetPassword = useAuthOperation({
    operation: ({ password, token, tokenId }) => app.emailPasswordAuth.resetPassword({ password, token, tokenId }),
    operationName: AuthOperationName.ResetPassword,
  });

  const logOut = useAuthOperation({
    operation: () => (app.currentUser ? app.currentUser.logOut() : Promise.resolve()),
    operationName: AuthOperationName.LogOut,
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
