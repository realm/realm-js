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

import { Fetcher } from "../Fetcher";
import { handleDeprecatedPositionalArgs } from "@realm.io/common";

/** @inheritdoc */
export class EmailPasswordAuth implements Realm.Auth.EmailPasswordAuth {
  private readonly fetcher: Fetcher;
  private readonly providerName: string;

  /**
   * Construct an interface to the email / password authentication provider.
   *
   * @param fetcher The underlying fetcher used to request the services.
   * @param providerName Optional custom name of the authentication provider.
   */
  constructor(fetcher: Fetcher, providerName = "local-userpass") {
    this.fetcher = fetcher;
    this.providerName = providerName;
  }

  /** @inheritdoc */
  async registerUser(email: string, password: string): Promise<void>;
  async registerUser(userDetails: Realm.Auth.RegisterUserDetails): Promise<void>;
  async registerUser(...args: [string, string] | [Realm.Auth.RegisterUserDetails]): Promise<void> {
    const { argsObject: userDetails } = handleDeprecatedPositionalArgs<Realm.Auth.RegisterUserDetails>(
      args,
      "registerUser",
      ["email", "password"],
    );

    const appRoute = this.fetcher.appRoute;
    await this.fetcher.fetchJSON({
      method: "POST",
      path: appRoute.emailPasswordAuth(this.providerName).register().path,
      body: userDetails,
    });
  }

  /** @inheritdoc */
  async confirmUser(token: string, tokenId: string): Promise<void>;
  async confirmUser(tokenDetails: Realm.Auth.ConfirmUserDetails): Promise<void>;
  async confirmUser(...args: [string, string] | [Realm.Auth.ConfirmUserDetails]): Promise<void> {
    const { argsObject: tokenDetails } = handleDeprecatedPositionalArgs<Realm.Auth.ConfirmUserDetails>(
      args,
      "confirmUser",
      ["token", "tokenId"],
    );

    const appRoute = this.fetcher.appRoute;
    await this.fetcher.fetchJSON({
      method: "POST",
      path: appRoute.emailPasswordAuth(this.providerName).confirm().path,
      body: tokenDetails,
    });
  }

  /** @inheritdoc */
  async resendConfirmationEmail(email: string): Promise<void>;
  async resendConfirmationEmail(emailDetails: Realm.Auth.ResendConfirmationDetails): Promise<void>;
  async resendConfirmationEmail(...args: [string] | [Realm.Auth.ResendConfirmationDetails]): Promise<void> {
    const { argsObject: emailDetails } = handleDeprecatedPositionalArgs<Realm.Auth.ResendConfirmationDetails>(
      args,
      "resendConfirmationEmail",
      ["email"],
    );

    const appRoute = this.fetcher.appRoute;
    await this.fetcher.fetchJSON({
      method: "POST",
      path: appRoute.emailPasswordAuth(this.providerName).confirmSend().path,
      body: emailDetails,
    });
  }

  /** @inheritdoc */
  async retryCustomConfirmation(email: string): Promise<void>;
  async retryCustomConfirmation(emailDetails: Realm.Auth.RetryCustomConfirmationDetails): Promise<void>;
  async retryCustomConfirmation(...args: [string] | [Realm.Auth.RetryCustomConfirmationDetails]): Promise<void> {
    const { argsObject: emailDetails } = handleDeprecatedPositionalArgs<Realm.Auth.RetryCustomConfirmationDetails>(
      args,
      "retryCustomConfirmation",
      ["email"],
    );

    const appRoute = this.fetcher.appRoute;
    await this.fetcher.fetchJSON({
      method: "POST",
      path: appRoute.emailPasswordAuth(this.providerName).confirmCall().path,
      body: emailDetails,
    });
  }

  /** @inheritdoc */
  async resetPassword(token: string, tokenId: string, password: string): Promise<void>;
  async resetPassword(resetDetails: Realm.Auth.ResetPasswordDetails): Promise<void>;
  async resetPassword(...args: [string, string, string] | [Realm.Auth.ResetPasswordDetails]): Promise<void> {
    const { argsObject: resetDetails } = handleDeprecatedPositionalArgs<Realm.Auth.ResetPasswordDetails>(
      args,
      "resetPassword",
      ["token", "tokenId", "password"],
    );

    const appRoute = this.fetcher.appRoute;
    await this.fetcher.fetchJSON({
      method: "POST",
      path: appRoute.emailPasswordAuth(this.providerName).reset().path,
      body: resetDetails,
    });
  }

  /** @inheritdoc */
  async sendResetPasswordEmail(email: string): Promise<void>;
  async sendResetPasswordEmail(emailDetails: Realm.Auth.SendResetPasswordDetails): Promise<void>;
  async sendResetPasswordEmail(...args: [string] | [Realm.Auth.SendResetPasswordDetails]): Promise<void> {
    const { argsObject: emailDetails } = handleDeprecatedPositionalArgs<Realm.Auth.SendResetPasswordDetails>(
      args,
      "sendResetPasswordEmail",
      ["email"],
    );

    const appRoute = this.fetcher.appRoute;
    await this.fetcher.fetchJSON({
      method: "POST",
      path: appRoute.emailPasswordAuth(this.providerName).resetSend().path,
      body: emailDetails,
    });
  }

  /** @inheritdoc */
  async callResetPasswordFunction(email: string, password: string, ...args: unknown[]): Promise<void>;
  async callResetPasswordFunction(
    resetDetails: Realm.Auth.CallResetPasswordFunctionDetails,
    ...args: unknown[]
  ): Promise<void>;
  async callResetPasswordFunction(
    ...args: [string, string, ...unknown[]] | [Realm.Auth.CallResetPasswordFunctionDetails, ...unknown[]]
  ): Promise<void> {
    const { argsObject: resetDetails, restArgs } =
      handleDeprecatedPositionalArgs<Realm.Auth.CallResetPasswordFunctionDetails>(
        args,
        "callResetPasswordFunction",
        ["email", "password"],
        true,
      );

    const appRoute = this.fetcher.appRoute;
    await this.fetcher.fetchJSON({
      method: "POST",
      path: appRoute.emailPasswordAuth(this.providerName).resetCall().path,
      body: { ...resetDetails, arguments: restArgs },
    });
  }
}
