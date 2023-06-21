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

interface UseEmailPasswordAuth {
  /**
   * Convenience function to log in a user with an email and password - users
   * could also call `logIn(Realm.Credentials.emailPassword(email, password))`.
   * @see https://www.mongodb.com/docs/realm/sdk/react-native/manage-users/manage-email-password-users/#add-appprovider-to-work-with-email-password-users
   */
  logIn(credentials: { email: string; password: string }): void;

  /**
   * Register a new user.
   * @see https://www.mongodb.com/docs/realm/sdk/react-native/manage-users/manage-email-password-users/#register-a-new-user-account
   */
  register(args: { email: string; password: string }): void;

  /**
   * Confirm a user's account by providing the `token` and `tokenId` received.
   * @see https://www.mongodb.com/docs/realm/sdk/react-native/manage-users/manage-email-password-users/#confirm-a-new-user-s-email-address
   */
  confirm(args: { token: string; tokenId: string }): void;

  /**
   * Resend a user's confirmation email.
   * @see https://www.mongodb.com/docs/realm/sdk/react-native/manage-users/manage-email-password-users/#resend-a-confirmation-email
   */
  resendConfirmationEmail(args: { email: string }): void;

  /**
   * Retry the custom confirmation function for a given user.
   * @see https://www.mongodb.com/docs/realm/sdk/react-native/manage-users/manage-email-password-users/#retry-a-user-confirmation-function
   */
  retryCustomConfirmation(args: { email: string }): void;

  /**
   * Send a password reset email for a given user.
   * @see https://www.mongodb.com/docs/realm/sdk/react-native/manage-users/manage-email-password-users/#send-a-password-reset-email
   */
  sendResetPasswordEmail(args: { email: string }): void;

  /**
   * Complete resetting a user's password.
   * @see https://www.mongodb.com/docs/realm/sdk/react-native/manage-users/manage-email-password-users/#send-a-password-reset-email
   */
  resetPassword(args: { token: string; tokenId: string; password: string }): void;

  /**
   * Call the configured password reset function, passing in any additional
   * arguments to the function.
   * @see https://www.mongodb.com/docs/realm/sdk/react-native/manage-users/manage-email-password-users/#call-a-password-reset-function
   */
  callResetPasswordFunction<Args extends unknown[] = []>(
    args: {
      email: string;
      password: string;
    },
    ...restArgs: Args
  ): void;

  /**
   * Log out the current user.
   * @see https://www.mongodb.com/docs/realm/sdk/react-native/manage-users/authenticate-users/#log-a-user-out
   */
  logOut(): void;

  /**
   * The {@link AuthResult} of the current (or last) operation performed for
   * this hook.
   */
  result: AuthResult;
}

/**
 * Hook providing operations and corresponding state for authenticating with an
 * Atlas App with Email/Password.  It also contains operations related to
 * Email/Password authentication, such as resetting password and confirming a user.
 *
 * The {@link AuthResult} values returned from this hook (e.g. `state`, `pending`, etc.) are
 * shared across all components under a given `AppProvider`, as only one operation can be in
 * progress at a given time (i.e. we will store the values on the context). This means that,
 * for example, multiple components can use the `useEmailPasswordAuth` hook to access
 * `result.pending` to render a spinner when login is in progress, without
 * needing to pass that state around or store it somewhere global in their app
 * code.
 * @returns An object containing operations and state related to Email/Password authentication.
 */
export function useEmailPasswordAuth(): UseEmailPasswordAuth {
  const app = useApp();
  const [result] = useAuthResult();

  const logIn = useAuthOperation({
    operation: useCallback(
      (credentials: { email: string; password: string }) => app.logIn(Realm.Credentials.emailPassword(credentials)),
      [app],
    ),
    operationName: AuthOperationName.LogIn,
  });

  const register = useAuthOperation({
    operation: useCallback(
      (credentials: { email: string; password: string }) => app.emailPasswordAuth.registerUser(credentials),
      [app],
    ),
    operationName: AuthOperationName.Register,
  });

  const confirm = useAuthOperation({
    operation: useCallback(
      (args: { token: string; tokenId: string }) => app.emailPasswordAuth.confirmUser(args),
      [app],
    ),
    operationName: AuthOperationName.Confirm,
  });

  const resendConfirmationEmail = useAuthOperation({
    operation: useCallback((args: { email: string }) => app.emailPasswordAuth.resendConfirmationEmail(args), [app]),
    operationName: AuthOperationName.ResendConfirmationEmail,
  });

  const retryCustomConfirmation = useAuthOperation({
    operation: useCallback((args: { email: string }) => app.emailPasswordAuth.retryCustomConfirmation(args), [app]),
    operationName: AuthOperationName.RetryCustomConfirmation,
  });

  const sendResetPasswordEmail = useAuthOperation({
    operation: useCallback((args: { email: string }) => app.emailPasswordAuth.sendResetPasswordEmail(args), [app]),
    operationName: AuthOperationName.SendResetPasswordEmail,
  });

  const callResetPasswordFunction = useAuthOperation<
    Parameters<typeof app.emailPasswordAuth.callResetPasswordFunction>
  >({
    operation: useCallback(
      (credentials: { email: string; password: string }, ...restArgs) =>
        app.emailPasswordAuth.callResetPasswordFunction(credentials, ...restArgs),
      [app],
    ),
    operationName: AuthOperationName.CallResetPasswordFunction,
  });

  const resetPassword = useAuthOperation({
    operation: (args: { password: string; token: string; tokenId: string }) =>
      app.emailPasswordAuth.resetPassword(args),
    operationName: AuthOperationName.ResetPassword,
  });

  const logOut = useAuthOperation({
    operation: async () => app.currentUser?.logOut(),
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
