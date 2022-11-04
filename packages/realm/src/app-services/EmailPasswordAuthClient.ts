////////////////////////////////////////////////////////////////////////////
//
// Copyright 2022 Realm Inc.
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

import { binding, Realm } from "../internal";

export class EmailPasswordAuthClient {
  /** @internal */
  public internal: binding.UsernamePasswordProviderClient;

  /** @internal */
  constructor(internal: binding.UsernamePasswordProviderClient) {
    this.internal = internal;
  }

  /**
   * Registers a new email identity with the email/password provider,
   * and sends a confirmation email to the provided address.
   *
   * @param details The new user's email and password details
   * @param details.email - The email address of the user to register.
   * @param details.password - The password that the user created for the new username/password identity.
   * @returns {Promise<void>}
   * @since v10.10.0
   */
  public async registerUser(details: { email: string; password: string }) {
    await this.internal.registerEmail(details.email, details.password);
  }

  /**
   * Confirms an email identity with the email/password provider.
   *
   * @param details The received token and ID details
   * @param details.token - The confirmation token that was emailed to the user.
   * @param details.tokenId - The confirmation token id that was emailed to the user.
   * @returns {Promise<void>}
   * @since v10.10.0
   */
  public async confirmUser(details: { token: string; tokenId: string }) {
    await this.internal.confirmUser(details.token, details.tokenId);
  }

  /**
   * Re-sends a confirmation email to a user that has registered but
   * not yet confirmed their email address.
   *
   * @param details The associated email details
   * @param details.email - The email address of the user to re-send a confirmation for.
   * @returns {Promise<void>}
   * @since v10.10.0
   */
  public async resendConfirmationEmail(detail: { email: string }) {
    await this.internal.resendConfirmationEmail(detail.email);
  }

  /**
   * Re-run the custom confirmation function for user that has registered but
   * not yet confirmed their email address.
   *
   * @param details The associated email details
   * @param details.email - The email address of the user to re-run the confirmation for.
   * @returns {Promise<void>}
   * @since v10.10.0
   */
  public async retryCustomConfirmation(details: { email: string }) {
    await this.internal.retryCustomConfirmation(details.email);
  }

  /**
   * Resets the password of an email identity using the password reset token emailed to a user.
   *
   * @param details The token and password details for the reset
   * @param details.password - The desired new password.
   * @param details.token - The password reset token that was emailed to the user.
   * @param details.tokenId - The password reset token id that was emailed to the user.
   * @returns {Promise<void>}
   * @since v10.10.0
   */
  public async resetPassword(details: { password: string; token: string; tokenId: string }) {
    await this.internal.resetPassword(details.password, details.token, details.tokenId);
  }

  /**
   * Sends an email to the user for resetting the password.
   *
   * @param details The email details to send the reset to
   * @param details.email - The email address of the user to re-send a confirmation for.
   * @returns {Promise<void>}
   * @since v10.10.0
   */
  public async sendResetPasswordEmail(credential: { email: string }) {
    await this.internal.sendResetPasswordEmail(credential.email);
  }

  public async callResetPasswordFunction(credentials: { email: string; password: string }, ...args: unknown[]) {
    throw new Error("Not yet implemented, need BSONArray");
  }
}
