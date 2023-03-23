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

import {
  Configuration,
  OpenRealmBehaviorType,
  OpenRealmTimeOutBehavior,
  ProgressNotificationCallback,
  PromiseHandle,
  Realm,
  SubscriptionsState,
  TimeoutError,
  TimeoutPromise,
  assert,
  binding,
  flags,
  validateConfiguration,
} from "./internal";

type OpenBehavior = {
  openBehavior: OpenRealmBehaviorType;
  timeOut?: number;
  timeOutBehavior?: OpenRealmTimeOutBehavior;
};

function determineBehavior(config: Configuration, realmExists: boolean): OpenBehavior {
  const { sync, openSyncedRealmLocally } = config;
  if (!sync || openSyncedRealmLocally) {
    return { openBehavior: OpenRealmBehaviorType.OpenImmediately };
  } else {
    const configProperty = realmExists ? "existingRealmFileBehavior" : "newRealmFileBehavior";
    const configBehavior = sync[configProperty];
    if (configBehavior) {
      const { type, timeOut, timeOutBehavior } = configBehavior;
      if (typeof timeOut !== "undefined") {
        assert.number(timeOut, "timeOut");
      }
      return { openBehavior: type, timeOut, timeOutBehavior };
    } else {
      return { openBehavior: OpenRealmBehaviorType.DownloadBeforeOpen }; // Default is downloadBeforeOpen
    }
  }
}

export class ProgressRealmPromise implements Promise<Realm> {
  /** @internal */
  private static instances = new Set<binding.WeakRef<ProgressRealmPromise>>();
  /**
   * Cancels all unresolved `ProgressRealmPromise` instances.
   * @internal
   */
  public static cancelAll() {
    assert(flags.ALLOW_CLEAR_TEST_STATE, "Set the flags.ALLOW_CLEAR_TEST_STATE = true before calling this.");
    for (const promiseRef of ProgressRealmPromise.instances) {
      promiseRef.deref()?.cancel();
    }
    ProgressRealmPromise.instances.clear();
  }
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
    if (flags.ALLOW_CLEAR_TEST_STATE) {
      ProgressRealmPromise.instances.add(new binding.WeakRef(this));
    }
    try {
      validateConfiguration(config);
      // Calling `Realm.exists()` before `binding.Realm.getSynchronizedRealm()` is necessary to capture
      // the correct value when this constructor was called since `binding.Realm.getSynchronizedRealm()`
      // will open the realm. This is needed when calling the Realm constructor.
      const realmExists = Realm.exists(config);
      const { openBehavior, timeOut, timeOutBehavior } = determineBehavior(config, realmExists);
      if (openBehavior === OpenRealmBehaviorType.OpenImmediately) {
        const realm = new Realm(config);
        this.handle.resolve(realm);
      } else if (openBehavior === OpenRealmBehaviorType.DownloadBeforeOpen) {
        const { bindingConfig } = Realm.transformConfig(config);
        // Construct an async open task
        this.task = binding.Realm.getSynchronizedRealm(bindingConfig);
        // If the promise handle gets rejected, we should cancel the open task
        // to avoid consuming a thread safe reference which is no longer registered
        this.handle.promise.catch(() => {
          if (this.task) {
            this.task.cancel();
          }
        });

        this.task
          .start()
          .then(async (tsr) => {
            const realm = new Realm(config, {
              internal: binding.Helpers.consumeThreadSafeReferenceToSharedRealm(tsr),
              // Do not call `Realm.exists()` here in case the realm has been opened by this point in time.
              realmExists,
            });
            if (config.sync?.flexible && !config.openSyncedRealmLocally) {
              const { subscriptions } = realm;
              if (subscriptions.state === SubscriptionsState.Pending) {
                await subscriptions.waitForSynchronization();
              }
            }
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
        throw new Error(`Unexpected open behavior '${openBehavior}'`);
      }
    } catch (err) {
      this.handle.reject(err);
    }
  }

  cancel(): void {
    if (this.task) {
      this.task.cancel();
      this.task.$resetSharedPtr();
      this.task = null;
    }
    this.timeoutPromise?.cancel();
    // Clearing all listeners to avoid accidental progress notifications
    this.listeners.clear();
    // Tell anything awaiting the promise
    const err = new Error("Async open canceled");
    this.handle.reject(err);
  }

  progress(callback: ProgressNotificationCallback): this {
    this.listeners.add(callback);
    return this;
  }

  then = this.handle.promise.then.bind(this.handle.promise);
  catch = this.handle.promise.catch.bind(this.handle.promise);
  finally = this.handle.promise.finally.bind(this.handle.promise);

  private emitProgress = (transferredArg: binding.Int64, transferableArg: binding.Int64) => {
    const transferred = binding.Int64.intToNum(transferredArg);
    const transferable = binding.Int64.intToNum(transferableArg);
    for (const listener of this.listeners) {
      listener(transferred, transferable);
    }
  };

  get [Symbol.toStringTag]() {
    return ProgressRealmPromise.name;
  }
}
