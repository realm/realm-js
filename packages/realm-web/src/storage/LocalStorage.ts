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
export class LocalStorage implements Storage {
    /**
     * Internal state of the storage
     */
    private readonly window: WindowLocalStorage;

    /**
     * Constructs a LocalStorage using the global window
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
}
