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

import { Document, ChangeEvent } from "./types";

type ChangeListener<T extends Document> = (event: ChangeEvent<T>) => void;
type ErrorListener = (error: Error) => void;

export class ChangeStream<T extends Document> {
    private changeListeners: ChangeListener<T>[] = [];
    private errorListeners: ErrorListener[] = [];
    private iterable: AsyncIterable<ChangeEvent<T>>;

    constructor(iterable: AsyncIterable<ChangeEvent<T>>) {
        this.iterable = iterable;
    }

    public [Symbol.asyncIterator](): AsyncIterator<ChangeEvent<T>> {
        return this.iterable[Symbol.asyncIterator]();
    }

    public onNext(listener: ChangeListener<T>) {
        const exists = this.changeListeners.find(l => l === listener);
        if (!exists) {
            this.changeListeners.push(listener);
        }
        // Enable chaining
        return this;
    }

    public onError(listener: ErrorListener) {
        const exists = this.errorListeners.find(l => l === listener);
        if (!exists) {
            this.errorListeners.push(listener);
        }
        // Enable chaining
        return this;
    }

    public close() {
        throw new Error("Not yet implemented");
    }

    private emitChange(event: ChangeEvent<T>) {
        for (const l of this.changeListeners) {
            l(event);
        }
    }

    private emitError(error: Error) {
        for (const l of this.errorListeners) {
            l(error);
        }
    }
}
