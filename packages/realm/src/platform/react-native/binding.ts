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

import { NativeModules } from "react-native";
import { NativeBigInt, PolyfilledBigInt, injectNativeModule } from "../binding";

const RealmNativeModule = NativeModules.Realm;

RealmNativeModule.injectModuleIntoJSGlobal();
// Read the global into the local scope
const { __injectedRealmBinding } = global;
// Delete the global again
delete global.__injectedRealmBinding;
if (typeof __injectedRealmBinding === "object") {
  injectNativeModule(__injectedRealmBinding, { Int64: global.HermesInternal ? NativeBigInt : PolyfilledBigInt });
} else {
  throw new Error(
    "Could not find the Realm binary. Please consult our troubleshooting guide: https://www.mongodb.com/docs/realm-sdks/js/latest/#md:troubleshooting-missing-binary",
  );
}
