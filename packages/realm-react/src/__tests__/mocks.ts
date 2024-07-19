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

import { act } from "@testing-library/react-native";
import { EstimateProgressNotificationCallback, ProgressRealmPromise, Realm } from "realm";

/**
 * Mocks {@link Realm.ProgressRealmPromise} with a custom
 * promise completion and progress handler.
 */
export class MockedProgressRealmPromise extends Promise<Realm> implements ProgressRealmPromise {
  private progressHandler?: (callback: EstimateProgressNotificationCallback) => void;

  constructor(
    callback: (resolve: (value: Realm) => void) => void,
    options?: {
      progress?: (callback: EstimateProgressNotificationCallback) => void;
    },
  ) {
    super(callback);
    this.progressHandler = options?.progress;
  }

  get [Symbol.toStringTag]() {
    return "MockedProgressRealmPromise";
  }

  cancel = () => this;

  progress = (callback: EstimateProgressNotificationCallback) => {
    this.progressHandler?.call(this, callback);
    return this;
  };
}

/**
 * Mocks the Realm.open operation with a delayed, predictable Realm creation.
 * If `options.progressValues` is specified, passes it through an equal interval to
 * `Realm.open(...).progress(...)` callback.
 * @returns Promise which resolves when the Realm is opened.
 */
export function mockRealmOpen(
  options: {
    /** Progress values which the `Realm.open(...).progress(...)` will receive in an equal interval. */
    progressValues?: number[];
    /** Duration of the Realm.open in milliseconds */
    delay?: number;
  } = {},
): MockedProgressRealmPromise {
  const { progressValues, delay = 100 } = options;
  let progressIndex = 0;

  const progressRealmPromise = new MockedProgressRealmPromise(
    (resolve) => {
      setTimeout(() => resolve(new Realm()), delay);
    },
    {
      progress: (callback) => {
        if (progressValues instanceof Array) {
          const sendProgress = () => {
            // Uses act as this causes a component state update.
            act(() => callback(progressValues[progressIndex]));
            progressIndex++;

            if (progressIndex <= progressValues.length) {
              // Send the next progress update in equidistant time
              setTimeout(sendProgress, delay / progressValues.length);
            }
          };
          sendProgress();
        }
      },
    },
  );

  const delayedRealmOpen = jest.spyOn(Realm, "open");
  delayedRealmOpen.mockImplementation(() => progressRealmPromise);
  return progressRealmPromise;
}
