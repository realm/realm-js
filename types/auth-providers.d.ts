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
         * Authentication provider where users identify using email and password.
         */
        class EmailPasswordAuth {
            /**
             * Register a new user.
             *
             * @param email The new users email.
             * @param password the new users passsword.
             */
            registerUser(email: string, password: string): Promise<void>;

            /**
             * Confirm a user by the token received.
             *
             * @param token the token received.
             * @param tokenId the id of the token received.
             */
            confirmUser(token: string, tokenId: string): Promise<void>;

            /**
             * Resend the confirmation email.
             *
             * @param email the email associated to resend the confirmation to.
             */
            resendConfirmationEmail(email: string): Promise<void>;

            /**
             * Complete resetting the password
             *
             * @param token the token received.
             * @param tokenId the id of the token received.
             * @param password the new password.
             */
            resetPassword(
                token: string,
                tokenId: string,
                password: string,
            ): Promise<void>;

            /**
             * Send an email with tokens to reset the password.
             *
             * @param email the email to send the tokens to.
             */
            sendResetPasswordEmail(email: string): Promise<void>;

            /**
             * Call the custom function to reset the password.
             *
             * @param email the email associated with the user.
             * @param password the new password.
             * @param args one or more arguments to pass to the function.
             */
            callResetPasswordFunction(
                email: string,
                password: string,
                ...args: any[],
            ): Promise<void>;
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
