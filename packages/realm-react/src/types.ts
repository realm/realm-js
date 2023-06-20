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

export enum AuthOperationName {
  LogIn = "logIn",
  LogInWithAnonymous = "logInWithAnonymous",
  LogInWithApiKey = "logInWithApiKey",
  LogInWithEmailPassword = "logInWithEmailPassword",
  LogInWithJWT = "logInWithJWT",
  LogInWithGoogle = "logInWithGoogle",
  LogInWithApple = "logInWithApple",
  LogInWithFacebook = "logInWithFacebook",
  LogInWithFunction = "logInWithFunction",
  LogOut = "logOut",
  Register = "register",
  Confirm = "confirm",
  ResendConfirmationEmail = "resendConfirmationEmail",
  RetryCustomConfirmation = "retryCustomConfirmation",
  SendResetPasswordEmail = "sendResetPasswordEmail",
  ResetPassword = "resetPassword",
  CallResetPasswordFunction = "callResetPasswordFunction",
}

/**
 * The `AuthError` is set based on the operation name and the error message.
 */
export class AuthError extends Error {
  public operation: AuthOperationName;
  constructor(operation: AuthOperationName, message: string) {
    super(message);
    this.name = "AuthError";
    this.operation = operation;
  }
}

/**
 * The possible states an {@link OperationResult} can be in.
 */
export enum OperationState {
  NotStarted = "not-started",
  Pending = "pending",
  Success = "success",
  Error = "error",
}

/**
 * Represents the state and result of a call to a hook operation. This is
 * designed to allow the user to update their UI accordingly without needing to
 * store separate React state to keep track of pending/error states etc.
 */
export type OperationResult = {
  /**
   * The current state of the operation.
   */
  state: OperationState;

  /**
   * The string name of the current operation running.
   */
  operation: AuthOperationName | null;

  /**
   * Convenience accessors, so users can write e.g. `loginResult.pending`
   * instead of `loginResult.state === OperationState.Pending`
   */
  pending: boolean;
  success: boolean;

  /**
   * The error returned from the operation, if any. This will only be populated
   * if `state === OperationState.Error`, and will be cleared each time the
   * operation is called.
   */
  error: AuthError | undefined;
};

export type AuthResult = OperationResult;
