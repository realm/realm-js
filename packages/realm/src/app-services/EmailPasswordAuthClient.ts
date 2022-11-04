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

  public async registerUser(credentials: { email: string; password: string }) {
    await this.internal.registerEmail(credentials.email, credentials.password);
  }

  public async confirmUser() {
    throw new Error("Not yet implemented");
  }

  public async resendConfirmationEmail() {
    throw new Error("Not yet implemented");
  }

  public async retryCustomConfirmation(credential: { email: string }) {
    await this.internal.retryCustomConfirmation(credential.email);
  }

  public async resetPassword() {
    throw new Error("Not yet implemented");
  }

  public async sendResetPasswordEmail() {
    throw new Error("Not yet implemented");
  }

  public async callResetPasswordFunction(credentials: { email: string; password: string }, ...args: unknown[]) {
    throw new Error("Not yet implemented");
  }
}
