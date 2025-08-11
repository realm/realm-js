////////////////////////////////////////////////////////////////////////////
//
// Copyright 2024 Realm Inc.
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

declare const global: Record<string, unknown>;

import { type TurboModule, TurboModuleRegistry } from "react-native";
import { NativeBigInt, PolyfilledBigInt, type binding, injectNativeModule } from "../binding";
import { assert } from "../../assert";
import { RealmInExpoGoError, isExpoGo } from "./expo-go-detection";

export interface RealmModule extends TurboModule {
  initialize(): unknown;
}

try {
  const RealmNativeModule = TurboModuleRegistry.getEnforcing<RealmModule>("Realm");
  const nativeModule = RealmNativeModule.initialize();
  // Inject the native module into the binding
  assert.object(nativeModule, "nativeModule");
  injectNativeModule(nativeModule, {
    Int64: (global.HermesInternal ? NativeBigInt : PolyfilledBigInt) as typeof binding.Int64,
    WeakRef: class WeakRef {
      private native: unknown;
      constructor(obj: unknown) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- See "createWeakRef" protocol in the jsi bindgen template
        this.native = (nativeModule as any).createWeakRef(obj);
      }
      deref() {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- See "createWeakRef" protocol in the jsi bindgen template
        return (nativeModule as any).lockWeakRef(this.native);
      }
    },
  });
} catch (err) {
  if (isExpoGo()) {
    throw new RealmInExpoGoError();
  } else {
    throw new Error(
      "Could not find the Realm binary. Please consult our troubleshooting guide: https://www.mongodb.com/docs/realm-sdks/js/latest/#md:troubleshooting-missing-binary",
    );
  }
}
