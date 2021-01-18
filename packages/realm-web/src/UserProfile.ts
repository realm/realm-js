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

import { deserialize } from "./utils/ejson";

/**
 * The type of a user.
 */
enum UserType {
    /**
     * A normal end-user created this user.
     */
    Normal = "normal",
    /**
     * The user was created by the server.
     */
    Server = "server",
}

/** @ignore */
enum DataKey {
    /** @ignore */
    NAME = "name",
    /** @ignore */
    EMAIL = "email",
    /** @ignore */
    PICTURE = "picture",
    /** @ignore */
    FIRST_NAME = "first_name",
    /** @ignore */
    LAST_NAME = "last_name",
    /** @ignore */
    GENDER = "gender",
    /** @ignore */
    BIRTHDAY = "birthday",
    /** @ignore */
    MIN_AGE = "min_age",
    /** @ignore */
    MAX_AGE = "max_age",
}

const DATA_MAPPING: { [k in DataKey]: keyof Realm.DefaultUserProfileData } = {
    [DataKey.NAME]: "name",
    [DataKey.EMAIL]: "email",
    [DataKey.PICTURE]: "pictureUrl",
    [DataKey.FIRST_NAME]: "firstName",
    [DataKey.LAST_NAME]: "lastName",
    [DataKey.GENDER]: "gender",
    [DataKey.BIRTHDAY]: "birthday",
    [DataKey.MIN_AGE]: "minAge",
    [DataKey.MAX_AGE]: "maxAge",
};

/** @inheritdoc */
export class UserProfile<UserProfileDataType = Realm.DefaultUserProfileData> {
    /** @ignore */
    public readonly type: Realm.UserType = UserType.Normal;

    /** @ignore */
    public readonly identities: Realm.UserIdentity[] = [];

    /** @ignore */
    public readonly data: UserProfileDataType;

    /**
     * @param response The response of a call fetching the users profile.
     */
    constructor(response?: unknown) {
        if (typeof response === "object" && response !== null) {
            const { type, identities, data } = response as {
                [k: string]: unknown;
            };

            if (typeof type === "string") {
                this.type = type as UserType;
            } else {
                throw new Error("Expected 'type' in the response body");
            }

            if (Array.isArray(identities)) {
                this.identities = identities.map((identity: any) => {
                    return {
                        id: identity.id,
                        providerType: identity["provider_type"],
                    };
                });
            } else {
                throw new Error("Expected 'identities' in the response body");
            }

            if (typeof data === "object" && data !== null) {
                const mappedData = Object.fromEntries(
                    Object.entries(data).map(([key, value]) => {
                        if (key in DATA_MAPPING) {
                            // Translate any known data field to its JS idiomatic alias
                            return [DATA_MAPPING[key as DataKey], value];
                        } else {
                            // Pass through any other values
                            return [key, value];
                        }
                    }),
                );
                // We can use `any` since we trust the user supplies the correct type
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                this.data = deserialize<any>(mappedData);
            } else {
                throw new Error("Expected 'data' in the response body");
            }
        } else {
            this.data = {} as UserProfileDataType;
        }
    }
}
