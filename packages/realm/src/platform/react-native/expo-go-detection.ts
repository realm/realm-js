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

import { Platform } from "react-native";

export function isExpoGo() {
  try {
    // @ts-expect-error - This depends on unstable Expo implementation details
    return typeof expo === "object" && expo.modules?.ExponentConstants?.executionEnvironment === "storeClient";
  } catch {
    return false;
  }
}

export class RealmInExpoGoError extends Error {
  constructor() {
    const runCommand = `npx expo run:${Platform.OS}`;
    super(
      `'realm' was imported from the Expo Go app, but unfortunately Expo Go doesn't contain the native module for the 'realm' package - consider using an Expo development build instead:\n\nnpx expo install expo-dev-client\n${runCommand}\n\nRead more: https://docs.expo.dev/develop/development-builds/introduction/`,
    );
  }
}

if (isExpoGo()) {
  throw new RealmInExpoGoError();
}
