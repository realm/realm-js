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

import { Configuration, PromiseHandle, Realm, assert, binding } from "./internal";

export class ProgressRealmPromise implements Promise<Realm> {
  private task: binding.AsyncOpenTask | null = null;
  /** @internal */
  private handle: PromiseHandle<Realm>;

  /** @internal */
  constructor(config: Configuration) {
    if (config.sync) {
      const { bindingConfig } = Realm.transformConfig(config);
      this.task = binding.Realm.getSynchronizedRealm(bindingConfig);
      this.handle = new PromiseHandle();
      this.task.start((realmInternal) => {
        try {
          const realm = new Realm(config);
          assert(
            realm.internal.$addr === (realmInternal as binding.Realm).$addr,
            "Expected the thread safe reference to pointing to the same Realm",
          );
          this.handle.resolve(realm);
        } catch (err) {
          this.handle.reject(err);
        }
      });
    } else {
      this.handle = new PromiseHandle();
      const realm = new Realm(config);
      this.handle.resolve(realm);
    }
  }

  get then() {
    return this.handle.promise.then.bind(this.handle.promise);
  }

  get catch() {
    return this.handle.promise.catch.bind(this.handle.promise);
  }

  get finally() {
    return this.handle.promise.finally.bind(this.handle.promise);
  }

  [Symbol.toStringTag] = ProgressRealmPromise.name;
}
