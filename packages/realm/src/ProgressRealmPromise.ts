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

import { Helpers } from "./binding";
import {
  Configuration,
  OpenRealmBehaviorType,
  OpenRealmTimeOutBehavior,
  ProgressNotificationCallback,
  PromiseHandle,
  Realm,
  TimeoutError,
  TimeoutPromise,
  assert,
  binding,
  validateConfiguration,
} from "./internal";

type OpenBehaviour = {
  openBehaviour: OpenRealmBehaviorType;
  timeOut?: number;
  timeOutBehavior?: OpenRealmTimeOutBehavior;
};

function determineBehaviour(config: Configuration): OpenBehaviour {
  const { sync } = config;
  if (!sync) {
    return { openBehaviour: OpenRealmBehaviorType.OpenImmediately };
  } else {
    const configProperty = Realm.exists(config) ? "existingRealmFileBehavior" : "newRealmFileBehavior";
    const configBehaviour = sync[configProperty];
    if (configBehaviour) {
      const { type, timeOut, timeOutBehavior } = configBehaviour;
      if (typeof timeOut !== "undefined") {
        assert.number(timeOut, "timeOut");
      }
      return { openBehaviour: type, timeOut, timeOutBehavior };
    } else {
      return { openBehaviour: OpenRealmBehaviorType.DownloadBeforeOpen }; // Default is downloadBeforeOpen
    }
  }
}

export class ProgressRealmPromise implements Promise<Realm> {
  /** @internal */
  private task: binding.AsyncOpenTask | null = null;
  /** @internal */
  private listeners = new Set<ProgressNotificationCallback>();
  /** @internal */
  private handle = new PromiseHandle<Realm>();
  /** @internal */
  private timeoutPromise: TimeoutPromise<Realm> | null = null;

  /** @internal */
  constructor(config: Configuration) {
    try {
      validateConfiguration(config);
      const { openBehaviour, timeOut, timeOutBehavior } = determineBehaviour(config);
      if (openBehaviour === OpenRealmBehaviorType.OpenImmediately) {
        const realm = new Realm(config);
        this.handle.resolve(realm);
      } else if (openBehaviour === OpenRealmBehaviorType.DownloadBeforeOpen) {
        const { bindingConfig } = Realm.transformConfig(config);
        this.task = binding.Realm.getSynchronizedRealm(bindingConfig);
        this.task
          .start()
          .then(async (tsr) => {
            // This callback is passed a `ThreadSafeReference` which can (except not easily) be resolved to a Realm
            // We could consider comparing that to the Realm we create below,
            // since the coordinator should ensure they're pointing to the same underlying Realm.
            const realm = new Realm(config, binding.Helpers.consumeThreadSafeReferenceToSharedRealm(tsr));

            const initialSubscriptions = config.sync && config.sync.flexible ? config.sync.initialSubscriptions : false;
            const realmExists = Realm.exists(config);
            if (!initialSubscriptions || (!initialSubscriptions.rerunOnOpen && realmExists)) {
              return realm;
            }
            // TODO: Implement this once flexible sync gets implemented
            // await realm.subscriptions.waitForSynchronization();
            // TODO: Consider implementing adding the subscriptions here as well
            throw new Error("'initialSubscriptions' is not yet supported");
            return realm;
          })
          .then(this.handle.resolve, this.handle.reject);
        // TODO: Consider storing the token returned here to unregister when the task gets cancelled,
        // if for some reason, that doesn't happen internally
        this.task.registerDownloadProgressNotifier(this.emitProgress);
        if (typeof timeOut === "number") {
          this.timeoutPromise = new TimeoutPromise(
            this.handle.promise, // Ensures the timeout gets cancelled when the realm opens
            timeOut,
            `Realm could not be downloaded in the allocated time: ${timeOut} ms.`,
          );
          if (timeOutBehavior === OpenRealmTimeOutBehavior.ThrowException) {
            // Make failing the timeout, reject the promise
            this.timeoutPromise.catch(this.handle.reject);
          } else if (timeOutBehavior === OpenRealmTimeOutBehavior.OpenLocalRealm) {
            // Make failing the timeout, resolve the promise
            this.timeoutPromise.catch((err) => {
              if (err instanceof TimeoutError) {
                const realm = new Realm(config);
                this.handle.resolve(realm);
              } else {
                this.handle.reject(err);
              }
            });
          } else {
            throw new Error(
              `Invalid 'timeOutBehavior': '${timeOutBehavior}'. Only 'throwException' and 'openLocalRealm' is allowed.`,
            );
          }
        }
      } else {
        throw new Error(`Unexpected open behaviour '${openBehaviour}'`);
      }
    } catch (err) {
      this.handle.reject(err);
    }
  }

  cancel(): void {
    this.task?.cancel();
    this.timeoutPromise?.cancel();
    // Clearing all listeners to avoid accidental progress notifications
    this.listeners.clear();
  }

  progress(callback: ProgressNotificationCallback): this {
    this.listeners.add(callback);
    return this;
  }

  then = this.handle.promise.then.bind(this.handle.promise);
  catch = this.handle.promise.catch.bind(this.handle.promise);
  finally = this.handle.promise.finally.bind(this.handle.promise);

  private emitProgress = (transferredArg: bigint, transferableArg: bigint) => {
    const transferred = Number(transferredArg);
    const transferable = Number(transferableArg);
    for (const listener of this.listeners) {
      listener(transferred, transferable);
    }
  };

  get [Symbol.toStringTag]() {
    return ProgressRealmPromise.name;
  }
}
