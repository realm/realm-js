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

/** @inheritdoc */
export class EmailPasswordAuth implements Realm.Auth.EmailPasswordAuth {
  private readonly fetcher: Fetcher;
  private readonly providerName: string;

  /**
   * Construct an interface to the email / password authentication provider.
   * @param fetcher The underlying fetcher used to request the services.
   * @param providerName Optional custom name of the authentication provider.
   */
  constructor(fetcher: Fetcher, providerName = "local-userpass") {
    this.fetcher = fetcher;
    this.providerName = providerName;
  }

  /** @inheritdoc */
  async registerUser(details: Realm.Auth.RegisterUserDetails): Promise<void> {
    const appRoute = this.fetcher.appRoute;
    await this.fetcher.fetchJSON({
      method: "POST",
      path: appRoute.emailPasswordAuth(this.providerName).register().path,
      body: details,
    });
  }

  /** @inheritdoc */
  async confirmUser(details: Realm.Auth.ConfirmUserDetails): Promise<void> {
    const appRoute = this.fetcher.appRoute;
    await this.fetcher.fetchJSON({
      method: "POST",
      path: appRoute.emailPasswordAuth(this.providerName).confirm().path,
      body: details,
    });
  }

  /** @inheritdoc */
  async resendConfirmationEmail(details: Realm.Auth.ResendConfirmationDetails): Promise<void> {
    const appRoute = this.fetcher.appRoute;
    await this.fetcher.fetchJSON({
      method: "POST",
      path: appRoute.emailPasswordAuth(this.providerName).confirmSend().path,
      body: details,
    });
  }

  /** @inheritdoc */
  async retryCustomConfirmation(details: Realm.Auth.RetryCustomConfirmationDetails): Promise<void> {
    const appRoute = this.fetcher.appRoute;
    await this.fetcher.fetchJSON({
      method: "POST",
      path: appRoute.emailPasswordAuth(this.providerName).confirmCall().path,
      body: details,
    });
  }

  /** @inheritdoc */
  async resetPassword(details: Realm.Auth.ResetPasswordDetails): Promise<void> {
    const appRoute = this.fetcher.appRoute;
    await this.fetcher.fetchJSON({
      method: "POST",
      path: appRoute.emailPasswordAuth(this.providerName).reset().path,
      body: details,
    });
  }

  /** @inheritdoc */
  async sendResetPasswordEmail(details: Realm.Auth.SendResetPasswordDetails): Promise<void> {
    const appRoute = this.fetcher.appRoute;
    await this.fetcher.fetchJSON({
      method: "POST",
      path: appRoute.emailPasswordAuth(this.providerName).resetSend().path,
      body: details,
    });
  }

  /** @inheritdoc */
  async callResetPasswordFunction(
    details: Realm.Auth.CallResetPasswordFunctionDetails,
    ...args: unknown[]
  ): Promise<void> {
    const appRoute = this.fetcher.appRoute;
    await this.fetcher.fetchJSON({
      method: "POST",
      path: appRoute.emailPasswordAuth(this.providerName).resetCall().path,
      body: { ...details, arguments: args },
    });
  }
}
