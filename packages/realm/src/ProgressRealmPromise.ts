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

import { Configuration, Realm, binding, validateConfiguration } from "./internal";

export type ProgressNotificationCallback = (transferred: number, transferable: number) => void;

export class ProgressRealmPromise extends Promise<Realm> {
  private task: binding.AsyncOpenTask | null = null;
  /** @internal */
  private listeners = new Set<ProgressNotificationCallback>();

  /** @internal */
  constructor(config: Configuration) {
    super((resolve, reject) => {
      try {
        validateConfiguration(config);
        if (!config.sync) {
          const realm = new Realm(config);
          resolve(realm);
        }
        const { bindingConfig } = Realm.transformConfig(config);
        this.task = binding.Realm.getSynchronizedRealm(bindingConfig);
        this.task.start((ref, err) => {
          // This callback is passed a `ThreadSafeReference` which can (except not easily) be resolved to a Realm
          // We could consider comparing that to the Realm we create below,
          // since the coordinator should ensure they're pointing to the same underlying Realm.
          if (err) {
            reject(err);
          }
          try {
            const realm = new Realm(config);
            resolve(realm);
          } catch (err) {
            reject(err);
          }
        });
        // TODO: Consider storing the token returned here to unregister when the task gets cancelled,
        // if for some reason, that doesn't happen internally
        this.task.registerDownloadProgressNotifier(this.emitProgress);
      } catch (err) {
        reject(err);
      }
    });
  }

  cancel(): void {
    this.task?.cancel();
    // Clearing all listeners to avoid accidental progress notifications
    this.listeners.clear();
  }

  progress(callback: ProgressNotificationCallback): this {
    this.listeners.add(callback);
    return this;
  }

  private emitProgress = (transferredArg: bigint, transferableArg: bigint) => {
    const transferred = Number(transferredArg);
    const transferable = Number(transferableArg);
    for (const listener of this.listeners) {
      listener(transferred, transferable);
    }
  };

  static get [Symbol.species]() {
    return Promise;
  }
}
