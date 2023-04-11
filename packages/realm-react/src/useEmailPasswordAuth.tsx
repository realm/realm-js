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
   * The {@link AuthResult} of the current (or last) operation performed for
   * this `RealmAppContext`.
   */
  result: AuthResult;
}

export function useEmailPasswordAuth(): UseEmailPasswordAuth {
  const app = useApp();
  const { result, logInWithEmailPassword } = useAuth();

  const [loginResult, setLoginResult] = useState<AuthResult>({
    state: OperationState.NotStarted,
    pending: false,
    success: false,
    error: undefined,
  });

  const [registerResult, setRegisterResult] = useState<AuthResult>({
    state: OperationState.NotStarted,
    pending: false,
    success: false,
    error: undefined,
  });

  const [confirmResult, setConfirmResult] = useState<AuthResult>({
    state: OperationState.NotStarted,
    pending: false,
    success: false,
    error: undefined,
  });

  const [resendConfirmationEmailResult, setResendConfirmationEmailResult] = useState<AuthResult>({
    state: OperationState.NotStarted,
    pending: false,
    success: false,
    error: undefined,
  });

  const [retryCustomConfirmationResult, setRetryCustomConfirmationResult] = useState<AuthResult>({
    state: OperationState.NotStarted,
    pending: false,
    success: false,
    error: undefined,
  });

  const [sendResetPasswordEmailResult, setSendResetPasswordEmailResult] = useState<AuthResult>({
    state: OperationState.NotStarted,
    pending: false,
    success: false,
    error: undefined,
  });

  const [resetPasswordResult, setResetPasswordResult] = useState<AuthResult>({
    state: OperationState.NotStarted,
    pending: false,
    success: false,
    error: undefined,
  });

  const [callResetPasswordFunctionResult, setCallResetPasswordFunctionResult] = useState<AuthResult>({
    state: OperationState.NotStarted,
    pending: false,
    success: false,
    error: undefined,
  });

  const currentOperationResultRef = useRef<AuthResult>({
    state: OperationState.NotStarted,
    pending: false,
    success: false,
    error: undefined,
  });

  const logIn = useCallback(
    ({ email, password }: { email: string; password: string }) => {
      if (result.pending || loginResult.pending) {
        throw new AuthError("Another log in operation is already in progress");
      }
      setLoginResult({ state: OperationState.Pending, pending: true, success: false, error: undefined });
      currentOperationResultRef.current = {
        state: OperationState.Pending,
        pending: true,
        success: false,
        error: undefined,
      };
      return logInWithEmailPassword({ email, password })
        .then((user) => {
          setLoginResult({ state: OperationState.Success, pending: false, success: true, error: undefined });
          currentOperationResultRef.current = {
            state: OperationState.Success,
            pending: false,
            success: true,
            error: undefined,
          };
          return user;
        })
        .catch((error) => {
          setLoginResult({ state: OperationState.Error, pending: false, success: false, error });
          currentOperationResultRef.current = { state: OperationState.Error, pending: false, success: false, error };
          throw error;
        });
    },
    [logInWithEmailPassword],
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
      if (registerResult.pending) {
        throw new AuthError("Another register operation is already in progress");
      }
      setRegisterResult({ state: OperationState.Pending, pending: true, success: false, error: undefined });
      currentOperationResultRef.current = {
        state: OperationState.Pending,
        pending: true,
        success: false,
        error: undefined,
      };
      return app.emailPasswordAuth
        .registerUser({ email, password })
        .then(() => {
          setRegisterResult({ state: OperationState.Success, pending: false, success: true, error: undefined });
          currentOperationResultRef.current = {
            state: OperationState.Success,
            pending: false,
            success: true,
            error: undefined,
          };
          if (loginAfterRegister) {
            return logIn({ email, password });
          }
        })
        .catch((error) => {
          setRegisterResult({ state: OperationState.Error, pending: false, success: false, error });
          currentOperationResultRef.current = { state: OperationState.Error, pending: false, success: false, error };
          throw error;
        });
    },
    [logIn],
  );

  const confirm = useCallback(
    ({ token, tokenId }: { token: string; tokenId: string }) => {
      if (confirmResult.pending) {
        throw new AuthError("Another confirm operation is already in progress");
      }

      setConfirmResult({ state: OperationState.Pending, pending: true, success: false, error: undefined });
      currentOperationResultRef.current = {
        state: OperationState.Pending,
        pending: true,
        success: false,
        error: undefined,
      };
      return app.emailPasswordAuth
        .confirmUser({ token, tokenId })
        .then((user) => {
          setConfirmResult({ state: OperationState.Success, pending: false, success: true, error: undefined });
          currentOperationResultRef.current = {
            state: OperationState.Success,
            pending: false,
            success: true,
            error: undefined,
          };
          return user;
        })
        .catch((error) => {
          setConfirmResult({ state: OperationState.Error, pending: false, success: false, error });
          currentOperationResultRef.current = { state: OperationState.Error, pending: false, success: false, error };
          throw error;
        });
    },
    [app],
  );

  const resendConfirmationEmail = useCallback(
    ({ email }: { email: string }) => {
      if (resendConfirmationEmailResult.pending) {
        throw new AuthError("Another resend confirmation email operation is already in progress");
      }

      setResendConfirmationEmailResult({
        state: OperationState.Pending,
        pending: true,
        success: false,
        error: undefined,
      });
      currentOperationResultRef.current = {
        state: OperationState.Pending,
        pending: true,
        success: false,
        error: undefined,
      };
      return app.emailPasswordAuth
        .resendConfirmationEmail({ email })

        .then(() => {
          setResendConfirmationEmailResult({
            state: OperationState.Success,
            pending: false,
            success: true,
            error: undefined,
          });
          currentOperationResultRef.current = {
            state: OperationState.Success,
            pending: false,
            success: true,
            error: undefined,
          };
        })
        .catch((error) => {
          setResendConfirmationEmailResult({ state: OperationState.Error, pending: false, success: false, error });
          currentOperationResultRef.current = { state: OperationState.Error, pending: false, success: false, error };
          throw error;
        });
    },
    [app],
  );

  const retryCustomConfirmation = useCallback(
    ({ email }: { email: string }) => {
      if (retryCustomConfirmationResult.pending) {
        throw new AuthError("Another retry custom confirmation operation is already in progress");
      }

      setRetryCustomConfirmationResult({
        state: OperationState.Pending,
        pending: true,
        success: false,
        error: undefined,
      });
      currentOperationResultRef.current = {
        state: OperationState.Pending,
        pending: true,
        success: false,
        error: undefined,
      };
      return app.emailPasswordAuth
        .retryCustomConfirmation({ email })
        .then(() => {
          setRetryCustomConfirmationResult({
            state: OperationState.Success,
            pending: false,
            success: true,
            error: undefined,
          });
          currentOperationResultRef.current = {
            state: OperationState.Success,
            pending: false,
            success: true,
            error: undefined,
          };
        })
        .catch((error) => {
          setRetryCustomConfirmationResult({ state: OperationState.Error, pending: false, success: false, error });
          currentOperationResultRef.current = { state: OperationState.Error, pending: false, success: false, error };
          throw error;
        });
    },
    [app],
  );

  const sendResetPasswordEmail = useCallback(
    ({ email }: { email: string }) => {
      if (sendResetPasswordEmailResult.pending) {
        throw new AuthError("Another send reset password email operation is already in progress");
      }

      setSendResetPasswordEmailResult({
        state: OperationState.Pending,
        pending: true,
        success: false,
        error: undefined,
      });
      currentOperationResultRef.current = {
        state: OperationState.Pending,
        pending: true,
        success: false,
        error: undefined,
      };
      return app.emailPasswordAuth
        .sendResetPasswordEmail({ email })
        .then(() => {
          setSendResetPasswordEmailResult({
            state: OperationState.Success,
            pending: false,
            success: true,
            error: undefined,
          });
          currentOperationResultRef.current = {
            state: OperationState.Success,
            pending: false,
            success: true,
            error: undefined,
          };
        })
        .catch((error) => {
          setSendResetPasswordEmailResult({ state: OperationState.Error, pending: false, success: false, error });
          currentOperationResultRef.current = { state: OperationState.Error, pending: false, success: false, error };
          throw error;
        });
    },
    [app],
  );

  const callResetPasswordFunction = useCallback(
    ({ email, password }: { email: string; password: string }, ...restArgs: unknown[]) => {
      if (callResetPasswordFunctionResult.pending) {
        throw new AuthError("Another call reset password function operation is already in progress");
      }

      setCallResetPasswordFunctionResult({
        state: OperationState.Pending,
        pending: true,
        success: false,
        error: undefined,
      });
      currentOperationResultRef.current = {
        state: OperationState.Pending,
        pending: true,
        success: false,
        error: undefined,
      };
      return app.emailPasswordAuth
        .callResetPasswordFunction({ email, password }, ...restArgs)
        .then(() => {
          setCallResetPasswordFunctionResult({
            state: OperationState.Success,
            pending: false,
            success: true,
            error: undefined,
          });
          currentOperationResultRef.current = {
            state: OperationState.Success,
            pending: false,
            success: true,
            error: undefined,
          };
        })
        .catch((error) => {
          setCallResetPasswordFunctionResult({ state: OperationState.Error, pending: false, success: false, error });
          currentOperationResultRef.current = { state: OperationState.Error, pending: false, success: false, error };
          throw error;
        });
    },
    [app],
  );

  const resetPassword = useCallback(
    ({ password, token, tokenId }: { password: string; token: string; tokenId: string }) => {
      if (resetPasswordResult.pending) {
        throw new AuthError("Another reset password operation is already in progress");
      }

      setResetPasswordResult({ state: OperationState.Pending, pending: true, success: false, error: undefined });
      currentOperationResultRef.current = {
        state: OperationState.Pending,
        pending: true,
        success: false,
        error: undefined,
      };
      return app.emailPasswordAuth
        .resetPassword({ password, token, tokenId })

        .then(() => {
          setResetPasswordResult({ state: OperationState.Success, pending: false, success: true, error: undefined });
          currentOperationResultRef.current = {
            state: OperationState.Success,
            pending: false,
            success: true,
            error: undefined,
          };
        })
        .catch((error) => {
          setResetPasswordResult({ state: OperationState.Error, pending: false, success: false, error });
          currentOperationResultRef.current = { state: OperationState.Error, pending: false, success: false, error };
          throw error;
        });
    },
    [app],
  );

  return {
    result: currentOperationResultRef.current,
    logIn,
    register,
    resendConfirmationEmail,
    confirm,
    retryCustomConfirmation,
    sendResetPasswordEmail,
    callResetPasswordFunction,
    resetPassword,
  };
}
