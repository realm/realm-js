import React from "react";

export {};

// START

/**
 * Props for the RealmAppProvider component. Users can specify one of either
 * an app ID, or an AppConfiguration if needed.
 */
type RealmAppProviderPropsBase = {
  appId?: string;
  config?: Realm.AppConfiguration;
};

type RealmAppProviderPropsWithAppId = RealmAppProviderPropsBase & {
  appId: string;
  config?: never;
};

type RealmAppProviderPropsWithConfig = RealmAppProviderPropsBase & {
  appId?: never;
  config: Realm.AppConfiguration;
};

type RealmAppProviderProps = RealmAppProviderPropsWithAppId | RealmAppProviderPropsWithConfig;

/**
 * React component providing a Realm app configuration on the context for the sync
 * hooks to use. A `RealmAppProvider` is required for an app to use the sync hooks.
 */
declare const RealmAppProvider: React.FC<RealmAppProviderProps>;

/**
 * Hook to access the current {@link Realm.App} from the {@link RealmAppProvider} context.
 */
declare function useApp(): {
  app: Realm.App | undefined;
};

/**
 * Authentication error types, based on generic_network_transport.hpp in core.
 * It would be nice to see if we are able to distinguish between more granular
 * error states, as these are quite broad and users would need to depend on the
 * text of the error message to know the exact error.
 */
enum AuthError {
  // e.g. wrong password for login
  AuthError,
  // e.g. password length wrong when registering.
  BadRequest,
  // account name in use when registering
  AccountNameInUse,
  // ? not sure when this happens
  InvalidEmailPassword,
}

/**
 * The possible states an operation can be in
 */
enum OperationState {
  None,
  Pending,
  Success,
  Error,
}

/**
 * Represents the state/result of a call to a hook operation, designed to allow the user
 * to update their UI accordingly without needing to store separate React state to keep
 * track of pending/error states etc.
 *
 * Inspired by the design of e.g. urql hooks:
 * https://formidable.com/open-source/urql/docs/api/core/#operationresult
 */
type OperationResult<ErrorT, StateT = OperationState> = {
  // The current state of the operation
  state: StateT;

  // Convenience accessors, so users can write e.g. `loginResult.pending` instead of
  // `loginResult.state === OperationState.Pending`
  pending: boolean;
  success: boolean;
  // The error, if any
  error: ErrorT | undefined;
};

/**
 * Represents the state/result of a call to an auth hook operation.
 */
type AuthResult = OperationResult<{
  type: AuthError;
  message: string;
}>;

/**
 * Hook providing operations and corresponding state for authenticating with
 * a Realm app.
 *
 * The {@link AuthResult} states returned from this hook are "global" for any components
 * under a given RealmAppProvider (i.e. we will store the state on the context),
 * so e.g. multiple components can use `useAuth` to access `loginResult.pending`
 * to render a spinner when login is in progress, without needing to pass that state
 * around or store it somewhere global in their app code.
 */
declare function useAuth(): {
  /**
   * The currently authenticated user, if any. This can be used to determine
   * whether to render the app UI or not if the app only works when logged in.
   */
  authenticatedUser: Realm.User | undefined;

  /**
   * Login with a {@link Realm.Credentials} instance. This allows login with any
   * authentication mechanism supported by Realm.
   *
   * @returns A `Realm.User` instance for the logged in user.
   * @throws if another login is already in progress for this `RealmAppProvider` context.
   * @throws if there is an error logging in.
   */
  login: (credentials: Realm.Credentials) => Promise<Realm.User>;

  /**
   * The state/result of the current (or last) login operation performed for this
   * `RealmAppContext`. There is one {@link AuthResult} for all `login` operations
   * within a given `RealmAppProvider` context, as only one login can be in progress
   * at a time (e.g. the state/result of {@link loginAnonymous} is also represented
   * by this).
   */
  loginResult: AuthResult;

  /**
   * Login an anonymous user.
   *
   * @returns A `Realm.User` instance for the logged in user.
   * @throws if another login is already in progress for this `RealmAppProvider` context.
   * @throws if there is an error logging in.
   */
  loginAnonymous: () => Promise<Realm.User>;
};

/**
 * Hook providing operations and corresponding state for authenticating with a Realm app
 * using email/password auth.
 */
declare function useEmailPasswordAuth(): {
  /**
   * Login a user with an email and password.
   *
   * @returns A `Realm.User` instance for the logged in user.
   * @throws if another login is already in progress for this `RealmAppProvider` context.
   * @throws if there is an error logging in.
   */
  loginUser: (args: { email: string; password: string }) => Promise<Realm.User>;

  /**
   * The state/result of the current (or last) login operation performed for this
   * `RealmAppContext`. This is the same as the `loginResult` returned from `useAuth()`,
   * also provided here for convenience.
   */
  loginResult: AuthResult;

  /**
   * Register a new user. By default this will login the newly registered user after they have
   * been succesfully registered, unless the `loginAfterRegister` property is `false`.
   *
   * @returns A `Realm.User` instance for the logged in user if `loginAfterRegister` is
   * `true`, `void` otherwise.
   * @throws if another registration is already in progress for this `RealmAppProvider` context.
   * @throws if there is an error registering the user.
   */
  registerUser: (args: {
    email: string;
    password: string;
    // Defaults to true so that a newly registered user is immediately logged in
    loginAfterRegister?: boolean;
  }) => Promise<Realm.User | void>;

  /**
   * The state/result of the current (or last) `registerUser` operation performed for this
   * `RealmAppContext`. This is the same as the `loginResult` returned from `useAuth()`,
   * also provided here for convenience.
   */
  registerUserResult: AuthResult;

  /**
   * Confirm a user's account by providing the `token` and `tokenId` received.
   *
   * @returns `void`
   * @throws if another confirmation is already in progress for this `RealmAppProvider` context.
   * @throws if there is an error confirming the user.
   */
  confirmUser: (args: { token: string; tokenId: string }) => Promise<void>;

  /**
   * The state/result of the current (or last) `confirmUser` operation performed for this
   * `RealmAppContext`.
   */
  // TODO is `AuthResult` correct?
  confirmUserResult: AuthResult;

  /**
   * Resend a user's confirmation email.
   *
   * @returns `void`
   * @throws if another confirmation email resend is already in progress for this `RealmAppProvider` context.
   * @throws if there is an error resending the confirmation email.
   */
  resendConfirmationEmail: (args: { email: string }) => Promise<void>;

  /**
   * The state/result of the current (or last) `resendConfirmationEmail` operation performed for this
   * `RealmAppContext`.
   */
  resendConfirmationEmailResult: AuthResult;

  /**
   * Retry the custom confirmation function for a given user.
   *
   * @returns `void`
   * @throws if another custom confirmation retry is already in progress for this `RealmAppProvider` context.
   * @throws if there is an error retrying the custom confirmation.
   */
  retryCustomConfirmation: (args: { email: string }) => Promise<void>;

  /**
   * The state/result of the current (or last) `retryCustomConfirmation` operation performed for this
   * `RealmAppContext`.
   */
  retryCustomConfirmationResult: AuthResult;

  /**
   * Complete resetting a user's password.
   *
   * @returns `void`
   * @throws if another password reset is already in progress for this `RealmAppProvider` context.
   * @throws if there is an error resetting the password.
   */
  resetPassword: (args: { token: string; tokenId: string; password: string }) => Promise<void>;

  /**
   * The state/result of the current (or last) `resetPassword` operation performed for this
   * `RealmAppContext`.
   */
  resetPasswordResult: AuthResult;

  /**
   * Send a password reset email for a given user.
   *
   * @returns `void`
   * @throws if another password reset send is already in progress for this `RealmAppProvider` context.
   * @throws if there is an error sending the password reset.
   */
  sendResetPasswordEmail: (args: { email: string }) => Promise<void>;

  /**
   * The state/result of the current (or last) `sendResetPasswordEmail` operation performed for this
   * `RealmAppContext`.
   */
  sendResetPasswordEmailResult: AuthResult;

  /**
   * Call the configured password reset function.
   *
   * @returns `void`
   * @throws if another password reset send is already in progress for this `RealmAppProvider` context.
   * @throws if there is an error sending the password reset.
   */
  callResetPasswordFunction: (args: { email: string; password: string }, ...restArgs: unknown[]) => Promise<void>;

  /**
   * The state/result of the current (or last) `callResetPasswordFunction` operation performed for this
   * `RealmAppContext`.
   */
  callResetPasswordFunctionResult: AuthResult;
};

/**
 * Represents the state/result of a call to a flexible sync subscriptions hook operation.
 */
type SubscriptionsResult = OperationResult<string>;

/**
 * Hook providing operations and corresponding state for working with flexible sync subscriptions.
 */
declare function useSubscriptions(): {
  /**
   * The current set of flexible sync subscriptions for the current `RealmAppProvider` context.
   */
  subscriptions: Realm.App.Sync.SubscriptionSet;

  /**
   * Update the current set of flexible sync subscriptions for the current `RealmAppProvider` context.
   * See {@link Realm.App.Sync.SubscriptionSet.update} for more information.
   *
   * @returns `void`
   * @throws if another subscriptions update is already in progress for this `RealmAppProvider` context.
   * @throws if there is an error updating the subscriptions.
   */
  updateSubscriptions: (callback: (mutableSubs: Realm.App.Sync.MutableSubscriptionSet) => void) => Promise<void>;

  /**
   * The state/result of the current (or last) `updateSubscriptions` operation performed for this
   * `RealmAppContext`.
   */
  updateSubscriptionsResult: SubscriptionsResult;
};

// END

useApp;
RealmAppProvider;
useAuth;
useSubscriptions;
useEmailPasswordAuth;
