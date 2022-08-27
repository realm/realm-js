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

import { getInternal } from "./internal";
import { Listeners } from "./Listeners";
import { CollectionChangeCallback } from "./Collection";
import { Results } from "./Results";
import { unwind } from "./ranges";

export class ResultsListeners<T> {
  constructor(private results: Results<T>) {}

  private listeners = new Listeners<CollectionChangeCallback<T>>((callback) => {
    return getInternal(this.results).addNotificationCallback((changes) => {
      try {
        callback(this.results, {
          deletions: unwind(changes.deletions),
          insertions: unwind(changes.insertions),
          oldModifications: unwind(changes.modifications),
          newModifications: unwind(changes.modificationsNew),
        });
      } catch (err) {
        // Scheduling a throw on the event loop,
        // since throwing synchroniously here would result in an abort in the calling C++
        setImmediate(() => {
          throw err;
        });
      }
    }, []);
  });

  addListener(callback: CollectionChangeCallback<T>): void {
    this.listeners.add(callback);
  }

  removeListener(callback: CollectionChangeCallback<T>): void {
    this.listeners.remove(callback);
  }

  removeAllListeners(): void {
    this.listeners.removeAll();
  }
}
