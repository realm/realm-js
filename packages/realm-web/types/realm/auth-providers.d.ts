////////////////////////////////////////////////////////////////////////////
//
// Copyright 2020 Realm Inc.
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

declare namespace Realm {
  /**
   * An object with interfaces to all possible authentication providers the app might have.
   */
  interface AuthProviders {
    /** Authentication provider where users identify using email and password. */
    emailPassword: Realm.Auth.EmailPasswordAuth;
    /** Authentication provider where users identify using an API-key. */
    apiKey: Realm.Auth.ApiKeyAuth;
  }

  namespace Auth {
    /**
     * Details for registering a user
     */
    interface RegisterUserDetails {
      /** The new user's email */
      email: string;
      /** The new user's passsword */
      password: string;
    }

    /**
     * Details for confirming a user
     */
    interface ConfirmUserDetails {
      /** The token received */
      token: string;
      /** The ID of the token received */
      tokenId: string;
    }

    /**
     * Details for resending a confirmation
     */
    interface ResendConfirmationDetails {
      /** The email associated to resend the confirmation to */
      email: string;
    }

    /**
     * Details for retrying a custom confirmation
     */
    interface RetryCustomConfirmationDetails {
      /** The email associated to resend the confirmation to */
      email: string;
    }

    /**
     * Details for resetting a password
     */
    interface ResetPasswordDetails {
      /** The token received */
      token: string;
      /** The id of the token received  */
      tokenId: string;
      /** The new password */
      password: string;
    }

    /**
     * Details for sending a reset password email
     */
    interface SendResetPasswordDetails {
      /** The email to send the tokens to */
      email: string;
    }

    /**
     * Details for calling a custom reset password function
     */
    interface CallResetPasswordFunctionDetails {
      /** The email associated with the user */
      email: string;
      /** The new password */
      password: string;
    }

    /**
     * Authentication provider where users identify using email and password.
     */
    class EmailPasswordAuth {
      /**
       * Register a new user.
       *
       * @param details The new user's email and password details
       * @since v10.10.0
       */
      registerUser(details: RegisterUserDetails): Promise<void>;

      /**
       * Confirm a user by the token received.
       *
       * @param details The received token and ID details
       * @since v10.10.0
       */
      confirmUser(details: ConfirmUserDetails): Promise<void>;

      /**
       * Resend the confirmation email.
       *
       * @param details The associated email details
       * @since v10.10.0
       */
      resendConfirmationEmail(details: ResendConfirmationDetails): Promise<void>;

      /**
       * Rerun the custom confirmation function.
       *
       * @param details The associated email details
       * @since v10.10.0
       */
      retryCustomConfirmation(details: RetryCustomConfirmationDetails): Promise<void>;

      /**
       * Complete resetting the password
       *
       * @param details The token and password details for the reset
       * @since v10.10.0
       */
      resetPassword(details: ResetPasswordDetails): Promise<void>;

      /**
       * Send an email with tokens to reset the password.
       *
       * @param details The email details to send the reset to
       * @since v10.10.0
       */
      sendResetPasswordEmail(details: SendResetPasswordDetails): Promise<void>;

      /**
       * Call the custom function to reset the password.
       *
       * @param details The email and password details to reset
       * @param args One or more arguments to pass to the function.
       * @since v10.10.0
       */
      callResetPasswordFunction(details: CallResetPasswordFunctionDetails, ...args: unknown[]): Promise<void>;
    }

    /**
     * The representation of an API-key stored in the service.
     */
    type ApiKey = {
      /**
       * The internal identifier of the key.
       */
      _id: string;

      /**
       * The secret part of the key.
       */
      key: string;

      /**
       * A name for the key.
       */
      name: string;

      /**
       * When disabled, the key cannot authenticate.
       */
      disabled: boolean;
    };

    /**
     * Authentication provider where users identify using an API-key.
     */
    class ApiKeyAuth {
      /**
       * Creates an API key that can be used to authenticate as the current user.
       *
       * @param name the name of the API key to be created.
       */
      create(name: string): Promise<ApiKey>;

      /**
       * Fetches an API key associated with the current user.
       *
       * @param keyId the id of the API key to fetch.
       */
      fetch(keyId: string): Promise<ApiKey>;

      /**
       * Fetches the API keys associated with the current user.
       */
      fetchAll(): Promise<ApiKey[]>;

      /**
       * Deletes an API key associated with the current user.
       *
       * @param keyId the id of the API key to delete
       */
      delete(keyId: string): Promise<void>;

      /**
       * Enables an API key associated with the current user.
       *
       * @param keyId the id of the API key to enable
       */
      enable(keyId: string): Promise<void>;

      /**
       * Disable an API key associated with the current user.
       *
       * @param keyId the id of the API key to disable
       */
      disable(keyId: string): Promise<void>;
    }
  }
}
