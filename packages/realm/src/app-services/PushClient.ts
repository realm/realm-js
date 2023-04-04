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

import { binding } from "../internal";
/**
 * Authentication provider where users identify using an API-key.
 */
export class PushClient {
  /** @internal */
  private user: binding.SyncUser;
  /** @internal */
  public internal: binding.PushClient;

  /** @internal */
  public constructor(user: binding.SyncUser, internal: binding.PushClient) {
    this.user = user;
    this.internal = internal;
  }

  /**
   * Register this device with the user.
   *
   * @param token A Firebase Cloud Messaging (FCM) token, retrieved via the firebase SDK.
   */
  async register(token: string) {
    await this.internal.registerDevice(token, this.user);
  }

  /**
   * Deregister this device with the user, to disable sending messages to this device.
   */
  async deregister() {
    await this.internal.deregisterDevice(this.user);
  }
}
