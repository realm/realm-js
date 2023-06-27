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

import { PrefixedStorage, Storage } from "./storage";

const USER_IDS_STORAGE_KEY = "userIds";
const DEVICE_ID_STORAGE_KEY = "deviceId";

/**
 * Storage specific to the app.
 */
export class AppStorage extends PrefixedStorage {
  /**
   * @param storage The underlying storage to wrap.
   * @param appId The id of the app.
   */
  constructor(storage: Storage, appId: string) {
    super(storage, `app(${appId})`);
  }

  /**
   * Reads out the list of user ids from storage.
   * @returns A list of user ids.
   */
  public getUserIds(): string[] {
    const userIdsString = this.get(USER_IDS_STORAGE_KEY);
    const userIds = userIdsString ? JSON.parse(userIdsString) : [];
    if (Array.isArray(userIds)) {
      // Remove any duplicates that might have been added
      // The Set preserves insertion order
      return [...new Set(userIds)];
    } else {
      throw new Error("Expected the user ids to be an array");
    }
  }

  /**
   * Sets the list of ids in storage.
   * Optionally merging with existing ids stored in the storage, by prepending these while voiding duplicates.
   * @param userIds The list of ids to store.
   * @param mergeWithExisting Prepend existing ids to avoid data-races with other apps using this storage.
   */
  public setUserIds(userIds: string[], mergeWithExisting: boolean): void {
    if (mergeWithExisting) {
      // Add any existing user id to the end of this list, avoiding duplicates
      const existingIds = this.getUserIds();
      for (const id of existingIds) {
        if (userIds.indexOf(id) === -1) {
          userIds.push(id);
        }
      }
    }
    // Store the list of ids
    this.set(USER_IDS_STORAGE_KEY, JSON.stringify(userIds));
  }

  /**
   * Remove an id from the list of ids.
   * @param userId The id of a User to be removed.
   */
  public removeUserId(userId: string): void {
    const existingIds = this.getUserIds();
    const userIds = existingIds.filter((id) => id !== userId);
    // Store the list of ids
    this.setUserIds(userIds, false);
  }

  /**
   * @returns id of this device (if any exists)
   */
  public getDeviceId(): string | null {
    return this.get(DEVICE_ID_STORAGE_KEY);
  }

  /**
   * @param deviceId The id of this device, to send on subsequent authentication requests.
   */
  public setDeviceId(deviceId: string): void {
    this.set(DEVICE_ID_STORAGE_KEY, deviceId);
  }
}
