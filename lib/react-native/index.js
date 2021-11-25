////////////////////////////////////////////////////////////////////////////
//
// Copyright 2021 Realm Inc.
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

import { Platform, NativeModules } from "react-native";

//switch how babel transpiled code creates children objects.
//Inheriting from Realm.Object with class syntax does not support using Reflect.construct the way babel transpiles it.
//Defining Reflect.construct.sham makes the transpiled code use different standard mechanism for inheriting. (Function.apply with setPrototypeOf)
if (typeof Reflect !== "undefined" && Reflect.construct) {
  Reflect.construct.sham = 1;
}

if (Platform.OS === "android") {
  // Getting the native module on Android will inject the Realm global (on Android)
  const RealmNativeModule = NativeModules.Realm;
  console.log({ RealmNativeModule, Realm: global.Realm });
}

// Otherwise, we must be in a "normal" react native situation.
// In that case, the Realm type should have been injected by the native code.
// If it hasn't, the user likely forgot to install the RealmJS CocoaPod
if (typeof global.Realm === "undefined") {
  throw new Error(
    'Missing Realm constructor. Did you run "pod install"? Please see https://realm.io/docs/react-native/latest/#missing-realm-constructor for troubleshooting',
  );
}

require("../extensions")(global.Realm);

const utils = require("../utils");
const versions = utils.getVersions();
global.Realm.App._setVersions(versions);

module.exports = global.Realm;
