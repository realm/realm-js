////////////////////////////////////////////////////////////////////////////
//
// Copyright 2023 Realm Inc.
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

import { register, logIn, logOut, openRealm, triggerConnectionChange } from "./realm-auth";
import { addDummyData, updateDummyData, deleteDummyData, getStore } from "./realm-query";

const exampleEmail = "john@doe.com";
const examplePassword = "123456";

/**
 * Illustrates the flow of using a synced Realm.
 */
async function main(): Promise<void> {
  let success = await register(exampleEmail, examplePassword);
  if (!success) {
    return;
  }

  success = await logIn(exampleEmail, examplePassword);
  if (!success) {
    return;
  }

  await openRealm();

  // Cleaning the DB for this example before continuing.
  deleteDummyData();
  addDummyData();
  updateDummyData();

  // Print a kiosk and its products.
  const store = getStore();
  const firstKiosk = store?.kiosks[0];
  if (firstKiosk) {
    console.log("Printing the first Kiosk:");
    console.log(JSON.stringify(firstKiosk, null, 2));
  }

  // Manually trigger the connection listener.
  const TRIGGER_LISTENER_AFTER_MS = 4000;
  triggerConnectionChange(TRIGGER_LISTENER_AFTER_MS, TRIGGER_LISTENER_AFTER_MS * 2);
}

main();
