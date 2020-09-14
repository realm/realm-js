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
     *
     * @param fetcher The underlying fetcher used to request the services.
     * @param providerName Optional custom name of the authentication provider.
     */
    constructor(fetcher: Fetcher, providerName = "local-userpass") {
        this.fetcher = fetcher;
        this.providerName = providerName;
    }

    /** @inheritdoc */
    async registerUser(email: string, password: string): Promise<void> {
        const appRoute = this.fetcher.appRoute;
        await this.fetcher.fetchJSON({
            method: "POST",
            path: appRoute.emailPasswordAuth(this.providerName).register().path,
            body: { email, password },
        });
    }

    /** @inheritdoc */
    async confirmUser(token: string, tokenId: string): Promise<void> {
        const appRoute = this.fetcher.appRoute;
        await this.fetcher.fetchJSON({
            method: "POST",
            path: appRoute.emailPasswordAuth(this.providerName).confirm().path,
            body: { token, tokenId },
        });
    }

    /** @inheritdoc */
    async resendConfirmationEmail(email: string): Promise<void> {
        const appRoute = this.fetcher.appRoute;
        await this.fetcher.fetchJSON({
            method: "POST",
            path: appRoute.emailPasswordAuth(this.providerName).confirmSend()
                .path,
            body: { email },
        });
    }

    /** @inheritdoc */
    async resetPassword(
        token: string,
        tokenId: string,
        password: string,
    ): Promise<void> {
        const appRoute = this.fetcher.appRoute;
        await this.fetcher.fetchJSON({
            method: "POST",
            url: appRoute.emailPasswordAuth(this.providerName).reset().path,
            body: { token, tokenId, password },
        });
    }

    /** @inheritdoc */
    async sendResetPasswordEmail(email: string): Promise<void> {
        const appRoute = this.fetcher.appRoute;
        await this.fetcher.fetchJSON({
            method: "POST",
            url: appRoute.emailPasswordAuth(this.providerName).resetSend().path,
            body: { email },
        });
    }

    /** @inheritdoc */
    async callResetPasswordFunction(
        email: string,
        password: string,
        ...args: any[]
    ): Promise<void> {
        const appRoute = this.fetcher.appRoute;
        await this.fetcher.fetchJSON({
            method: "POST",
            url: appRoute.emailPasswordAuth(this.providerName).resetCall().path,
            body: { email, password, arguments: args },
        });
    }
}
