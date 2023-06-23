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
import { UserProfile } from "./UserProfile";
import { ProviderType } from "./Credentials";

const ACCESS_TOKEN_STORAGE_KEY = "accessToken";
const REFRESH_TOKEN_STORAGE_KEY = "refreshToken";
const PROFILE_STORAGE_KEY = "profile";
const PROVIDER_TYPE_STORAGE_KEY = "providerType";

/**
 * Storage specific to the app.
 */
export class UserStorage<UserProfileDataType = Realm.DefaultUserProfileData> extends PrefixedStorage {
  /**
   * Construct a storage for a `User`.
   * @param storage The underlying storage to wrap.
   * @param userId The id of the user.
   */
  constructor(storage: Storage, userId: string) {
    super(storage, `user(${userId})`);
  }

  /**
   * Get the access token from storage.
   * @returns Access token (null if unknown).
   */
  get accessToken(): string | null {
    return this.get(ACCESS_TOKEN_STORAGE_KEY);
  }

  /**
   * Set the access token in storage.
   * @param value Access token (null if unknown).
   */
  set accessToken(value: string | null) {
    if (value === null) {
      this.remove(ACCESS_TOKEN_STORAGE_KEY);
    } else {
      this.set(ACCESS_TOKEN_STORAGE_KEY, value);
    }
  }

  /**
   * Get the refresh token from storage.
   * @returns Refresh token (null if unknown and user is logged out).
   */
  get refreshToken(): string | null {
    return this.get(REFRESH_TOKEN_STORAGE_KEY);
  }

  /**
   * Set the refresh token in storage.
   * @param value Refresh token (null if unknown and user is logged out).
   */
  set refreshToken(value: string | null) {
    if (value === null) {
      this.remove(REFRESH_TOKEN_STORAGE_KEY);
    } else {
      this.set(REFRESH_TOKEN_STORAGE_KEY, value);
    }
  }

  /**
   * Get the user profile from storage.
   * @returns User profile (undefined if its unknown).
   */
  get profile(): UserProfile<UserProfileDataType> | undefined {
    const value = this.get(PROFILE_STORAGE_KEY);
    if (value) {
      const profile = new UserProfile<UserProfileDataType>();
      // Patch in the values
      Object.assign(profile, JSON.parse(value));
      return profile;
    }
  }

  /**
   * Set the user profile in storage.
   * @param value User profile (undefined if its unknown).
   */
  set profile(value: UserProfile<UserProfileDataType> | undefined) {
    if (value) {
      this.set(PROFILE_STORAGE_KEY, JSON.stringify(value));
    } else {
      this.remove(PROFILE_STORAGE_KEY);
    }
  }

  /**
   * Get the type of authentication provider used to authenticate
   * @returns User profile (undefined if its unknown).
   */
  get providerType(): ProviderType | undefined {
    const value = this.get(PROVIDER_TYPE_STORAGE_KEY);
    if (value) {
      return value as ProviderType;
    }
  }

  /**
   * Set the type of authentication provider used to authenticate
   * @param value Type of authentication provider.
   */
  set providerType(value: ProviderType | undefined) {
    if (value) {
      this.set(PROVIDER_TYPE_STORAGE_KEY, value);
    } else {
      this.remove(PROVIDER_TYPE_STORAGE_KEY);
    }
  }
}
