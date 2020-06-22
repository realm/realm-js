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

import { Storage } from "./Storage";
import { PrefixedStorage } from "./PrefixedStorage";

/**
 * In-memory storage that will not be persisted.
 */
export class MemoryStorage implements Storage {
    /**
     * Internal state of the storage
     */
    private readonly storage: { [key: string]: string } = {};

    /** @inheritdoc */
    public get(key: string): string | null {
        if (key in this.storage) {
            return this.storage[key];
        } else {
            return null;
        }
    }

    /** @inheritdoc */
    public set(key: string, value: string) {
        this.storage[key] = value;
    }

    /** @inheritdoc */
    public remove(key: string) {
        delete this.storage[key];
    }

    /** @inheritdoc */
    public prefix(keyPart: string): Storage {
        return new PrefixedStorage(this, keyPart);
    }

    /** @inheritdoc */
    public clear(prefix?: string) {
        // Iterate all keys and delete their values if they have a matching prefix
        for (const key of Object.keys(this.storage)) {
            if (!prefix || key.startsWith(prefix)) {
                delete this.storage[key];
            }
        }
    }
}
