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

import { binding } from "./binding";
import { flags } from "./flags";
import { indirect } from "./indirect";
import { type Configuration, validateConfiguration } from "./Configuration";
import { PromiseHandle } from "./PromiseHandle";
import type { TimeoutPromise } from "./TimeoutPromise";
import type { Realm } from "./Realm";

export class ProgressRealmPromise implements Promise<Realm> {
  /** @internal */
  private static instances = new Set<binding.WeakRef<ProgressRealmPromise>>();
  /**
   * Cancels all unresolved `ProgressRealmPromise` instances.
   * @internal
   */
  public static cancelAll() {
    for (const promiseRef of ProgressRealmPromise.instances) {
      promiseRef.deref()?.cancel();
    }
    ProgressRealmPromise.instances.clear();
  }
  /** @internal */
  private task: binding.AsyncOpenTask | null = null;
  /** @internal */
  private handle = new PromiseHandle<Realm>();
  /** @internal */
  private timeoutPromise: TimeoutPromise<Realm> | null = null;
  /**
   * Token used for unregistering the progress notifier.
   * @internal
   */
  private notifierToken: null = null;

  /** @internal */
  constructor(config: Configuration) {
    if (flags.ALLOW_CLEAR_TEST_STATE) {
      ProgressRealmPromise.instances.add(new binding.WeakRef(this));
    }
    try {
      validateConfiguration(config);
      const realm = new indirect.Realm(config);
      this.handle.resolve(realm);
    } catch (err) {
      if (this.notifierToken !== null) {
        this.notifierToken = null;
      }
      this.handle.reject(err);
    }
  }

  /**
   * Cancels the download of the Realm
   * If multiple `ProgressRealmPromise` instances are in progress for the same Realm, then canceling one of them
   * will cancel all of them.
   */
  cancel(): void {
    this.cancelAndResetTask();
    this.timeoutPromise?.cancel();
    if (this.notifierToken !== null) {
      this.notifierToken = null;
    }
    // Tell anything awaiting the promise
    this.rejectAsCanceled();
  }

  then = this.handle.promise.then.bind(this.handle.promise);
  catch = this.handle.promise.catch.bind(this.handle.promise);
  finally = this.handle.promise.finally.bind(this.handle.promise);

  /** @internal */
  private cancelAndResetTask() {
    if (this.task) {
      this.task = null;
    }
  }

  /** @internal */
  private rejectAsCanceled() {
    const err = new Error("Async open canceled");
    this.handle.reject(err);
  }

  get [Symbol.toStringTag]() {
    return ProgressRealmPromise.name;
  }
}
