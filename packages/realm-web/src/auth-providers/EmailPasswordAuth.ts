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

import { Transport } from "../transports/Transport";

/** @inheritdoc */
export class EmailPasswordAuth implements Realm.Auth.EmailPasswordAuth {
    /**
     * The underlying transport.
     */
    private readonly transport: Transport;

    /**
     * Construct an interface to the email / password authentication provider.
     *
     * @param transport The underlying transport used to request the services.
     * @param providerName Optional custom name of the authentication provider.
     */
    constructor(transport: Transport, providerName = "local-userpass") {
        this.transport = transport.prefix(`/auth/providers/${providerName}`);
    }

    /** @inheritdoc */
    registerUser(email: string, password: string): Promise<void> {
        return this.transport.fetch({
            method: "POST",
            path: "/register",
            body: { email, password },
        });
    }

    /** @inheritdoc */
    confirmUser(token: string, tokenId: string): Promise<void> {
        return this.transport.fetch({
            method: "POST",
            path: "/confirm",
            body: { token, tokenId },
        });
    }

    /** @inheritdoc */
    resendConfirmationEmail(email: string): Promise<void> {
        return this.transport.fetch({
            method: "POST",
            path: "/confirm/send",
            body: { email },
        });
    }

    /** @inheritdoc */
    resetPassword(
        token: string,
        tokenId: string,
        password: string,
    ): Promise<void> {
        return this.transport.fetch({
            method: "POST",
            path: "/reset",
            body: { token, tokenId, password },
        });
    }

    /** @inheritdoc */
    sendResetPasswordEmail(email: string): Promise<void> {
        return this.transport.fetch({
            method: "POST",
            path: "/reset/send",
            body: { email },
        });
    }

    /** @inheritdoc */
    callResetPasswordFunction(
        email: string,
        password: string,
        args: any[],
    ): Promise<void> {
        return this.transport.fetch({
            method: "POST",
            path: "/reset/call",
            body: { email, password, arguments: args },
        });
    }
}
