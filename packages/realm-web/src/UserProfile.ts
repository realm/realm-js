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

const DATA_MAPPING: { [k in DataKey]: keyof UserProfile } = {
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
export class UserProfile implements Realm.UserProfile {
    /** @inheritdoc */
    public readonly name?: string;

    /** @inheritdoc */
    public readonly email?: string;

    /** @inheritdoc */
    public readonly pictureUrl?: string;

    /** @inheritdoc */
    public readonly firstName?: string;

    /** @inheritdoc */
    public readonly lastName?: string;

    /** @inheritdoc */
    public readonly gender?: string;

    /** @inheritdoc */
    public readonly birthday?: string;

    /** @inheritdoc */
    public readonly minAge?: string;

    /** @inheritdoc */
    public readonly maxAge?: string;

    /** @inheritdoc */
    public readonly data?: any;

    /** @inheritdoc */
    public readonly type: Realm.UserType = UserType.Normal;

    /** @inheritdoc */
    public readonly identities: Realm.UserIdentity[] = [];

    /**
     * @param response The response of a call fetching the users profile.
     */
    constructor(response?: any) {
        if (response) {
            if (typeof response.type === "string") {
                this.type = response.type;
            } else {
                throw new Error("Expected 'type' in the response body");
            }

            if (Array.isArray(response.identities)) {
                this.identities = response.identities.map((identity: any) => {
                    return {
                        id: identity.id,
                        providerId: identity["provider_id"],
                        providerType: identity["provider_type"],
                    };
                });
            } else {
                throw new Error("Expected 'identities' in the response body");
            }

            const { data } = response;
            if (typeof data === "object") {
                for (const key in DATA_MAPPING) {
                    const value = data[key];
                    const propertyName = DATA_MAPPING[key as DataKey];
                    if (
                        typeof value === "string" &&
                        propertyName !== "identities" &&
                        propertyName !== "type"
                    ) {
                        this[propertyName] = value;
                    }
                }
                // Add remaining data to `data` property
                const metadata = Object.entries(data).reduce((acc, entry) => {
                    if (DATA_MAPPING[entry[0] as DataKey]) {
                        return acc;
                    }
                    acc[entry[0]] = entry[1];
                    return acc;
                }, {} as Record<string, unknown>);
                if (Object.keys(metadata).length > 0) {
                    this.data = metadata;
                }
            } else {
                throw new Error("Expected 'data' in the response body");
            }
        }
    }
}
