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

import { Storage, StorageChangeListner } from "../storage/Storage";
import { PrefixedStorage } from "../storage/PrefixedStorage";

/**
 * In-memory storage that will not be persisted.
 */
export class LocalStorage implements Storage {
    /**
     * Internal state of the storage.
     */
    private readonly window: Window;

    /**
     * Constructs a LocalStorage using the global window.
     */
    constructor() {
        if (typeof window === "object") {
            this.window = window;
        } else {
            throw new Error(
                "Cannot use LocalStorage without a global window object",
            );
        }
    }

    /** @inheritdoc */
    public get(key: string): string | null {
        return this.window.localStorage.getItem(key);
    }

    /** @inheritdoc */
    public set(key: string, value: string) {
        return this.window.localStorage.setItem(key, value);
    }

    /** @inheritdoc */
    public remove(key: string) {
        return this.window.localStorage.removeItem(key);
    }

    /** @inheritdoc */
    public prefix(keyPart: string): Storage {
        return new PrefixedStorage(this, keyPart);
    }

    /** @inheritdoc */
    public clear(prefix?: string) {
        const keys = [];
        // Iterate all keys to find the once have a matching prefix.
        for (let i = 0; i < this.window.localStorage.length; i++) {
            const key = this.window.localStorage.key(i);
            if (key && (!prefix || key.startsWith(prefix))) {
                keys.push(key);
            }
        }
        // Remove the items in a seperate loop to avoid updating while iterating.
        for (const key of keys) {
            this.window.localStorage.removeItem(key);
        }
    }

    /** @inheritdoc */
    public addListener(listener: StorageChangeListner) {
        return this.window.addEventListener("storage", listener);
    }

    /** @inheritdoc */
    public removeListener(listener: StorageChangeListner) {
        return this.window.removeEventListener("storage", listener);
    }
}
