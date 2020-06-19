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

const ACCESS_TOKEN_STORAGE_KEY = "accessToken";
const REFRESH_TOKEN_STORAGE_KEY = "refreshToken";
const PROFILE_STORAGE_KEY = "profile";

/**
 * Storage specific to the app.
 */
export class UserStorage extends PrefixedStorage {
    /**
     * Construct a storage for a `User`
     *
     * @param storage The underlying storage to wrap.
     * @param userId The id of the user.
     */
    constructor(storage: Storage, userId: string) {
        super(storage, `user(${userId})`);
    }

    /**
     * Get the access token from storage
     *
     * @returns Access token.
     */
    get accessToken() {
        return this.get(ACCESS_TOKEN_STORAGE_KEY);
    }

    /**
     * Set the access token in storage.
     *
     * @param value Access token.
     */
    set accessToken(value: string | null) {
        if (value === null) {
            this.remove(ACCESS_TOKEN_STORAGE_KEY);
        } else {
            this.set(ACCESS_TOKEN_STORAGE_KEY, value);
        }
    }

    /**
     * Get the refresh token from storage
     *
     * @returns Refresh token.
     */
    get refreshToken() {
        return this.get(REFRESH_TOKEN_STORAGE_KEY);
    }

    /**
     * Set the refresh token in storage.
     *
     * @param value Refresh token.
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
     *
     * @returns User profile.
     */
    get profile() {
        const value = this.get(PROFILE_STORAGE_KEY);
        if (value) {
            const profile = new UserProfile();
            // Patch in the values
            Object.assign(profile, JSON.parse(value));
            return profile;
        }
    }

    /**
     * Set the user profile in storage.
     *
     * @param value User profile.
     */
    set profile(value: UserProfile | undefined) {
        if (value === null) {
            this.remove(PROFILE_STORAGE_KEY);
        } else {
            this.set(PROFILE_STORAGE_KEY, JSON.stringify(value));
        }
    }

    /**
     * Clears all values saved in the store
     */
    public removeAll() {
        this.remove(ACCESS_TOKEN_STORAGE_KEY);
        this.remove(REFRESH_TOKEN_STORAGE_KEY);
        this.remove(PROFILE_STORAGE_KEY);
    }
}
