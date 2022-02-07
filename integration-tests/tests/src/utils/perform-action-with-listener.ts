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

/**
 * Allows awaiting for a realm listener event based on some realm action.
 * It can actually be used without Realm, but thats the current context it was made for.
 *
 * Example:
 * ```
 * await performActionWithListener(
 *   () => {
 *     realm.write(() => {
 *       // Change the linked object in the collection
 *       person.age = 13;
 *     });
 *   },
 *   (resolve) => {
 *     const listenerFn: Realm.CollectionChangeCallback<IDog> = (_, changes) => {
 *       // Verify that the first item in the collection was modified
 *       if (changes.newModifications.length > 0 && changes.newModifications.includes(0)) {
 *         resolve();
 *       }
 *     };
 *     collection.addListener(listenerFn);
 *   },
 * );
 *```
 *
 * @param action Action to perform
 * @param setupListener Function called before action which can be used to setup a listener
 */
export const performActionWithListener = async (
  action: () => void,
  setupListener: (resolve: (value?: unknown) => void, reject: (reason?: any) => void) => void,
): Promise<unknown> => {
  return new Promise((resolve, reject) => {
    setupListener(resolve, reject);
    action();
  });
};
