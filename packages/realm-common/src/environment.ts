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

let isDevelopmentModeImpl = (): boolean => false;

/**
 * Check whether the user's app is running in "development mode" (e.g. `npm run dev`
 * for a React app, or `NODE_ENV=development` for a Node app). Each platform's entry
 * point should define the implementation of this using `setIsDevelopmentModeImpl`.
 * The default behaviour if the implementation is not defined is to always return `false`.
 *
 * @returns true if the user's app is running in development mode, false otherwise
 */
export const isDevelopmentMode = (): boolean => isDevelopmentModeImpl();

/**
 * Set the implementation used for `isDevelopmentMode`. This allows each entry point
 * (node vs DOM) to specify an appropriate implementation, while maintaing a common
 * interface.
 *
 * @param impl A function returning a boolean indicating whether the user's app is running
 * in development mode or not.
 */
export const setIsDevelopmentModeImpl = (impl: typeof isDevelopmentModeImpl): void => {
  isDevelopmentModeImpl = impl;
};
