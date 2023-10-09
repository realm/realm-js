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

import process from "node:process";
import Realm, {
  BSON,
  ClientResetMode,
  CollectionChangeCallback,
  ConfigurationWithSync,
  OpenRealmBehaviorType,
} from "realm";

import { SYNC_STORE_ID } from "./atlas-app-services/config";
import { Kiosk } from "./models/Kiosk";
import { Product, getRandomProductName } from "./models/Product";
import { Store } from "./models/Store";
import { getCurrentUser } from "./demo-auth-triggers";
import { getFloatBetween, getIntBetween } from "./utils/random";
import { handleConnectionChange, handlePostClientReset, handlePreClientReset, handleSyncError } from "./demo-sync-triggers";
import { logger } from "./utils/logger";

let realm: Realm | null = null;

export function getRealm(): Realm | null {
  return realm;
}

/**
 * Configures and opens the synced realm.
 */
export async function openRealm(): Promise<Realm> {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      throw new Error("The user needs to be logged in before the synced Realm can be opened.");
    }

    const config: ConfigurationWithSync = {
      schema: [Store, Kiosk, Product],
      sync: {
        user: currentUser,
        flexible: true,
        // To sync a preferred subset of data to the device, we only subscribe to
        // the kiosks and products in a particular store. For this demo, we have
        // defined the specific store ID in `app/atlas-app-services/config.ts`.
        // When adding subscriptions, best practice is to name each subscription
        // for better managing removal of them. To read more about subscriptions, see:
        // https://www.mongodb.com/docs/realm/sdk/node/examples/flexible-sync/
        initialSubscriptions: {
          update: (mutableSubs, realm) => {
            // Subscribe to the store with the given ID.
            mutableSubs.add(
              realm.objects(Store).filtered("_id = $0", SYNC_STORE_ID),
              { name: "storeA" },
            );
            // Subscribe to all kiosks in the store with the given ID.
            mutableSubs.add(
              realm.objects(Kiosk).filtered("storeId = $0", SYNC_STORE_ID),
              { name: "kiosksInStoreA" },
            );
            // Subscribe to all products in the store with the given ID.
            mutableSubs.add(
              realm.objects(Product).filtered("storeId = $0", SYNC_STORE_ID),
              { name: "productsInStoreA" },
            );
          },
        },
        // The `ClientResetMode.RecoverOrDiscardUnsyncedChanges` will download a fresh copy
        // from the server if recovery of unsynced changes is not possible. For read-only
        // clients, `ClientResetMode.DiscardUnsyncedChanges` is suitable.
        clientReset: {
          mode: ClientResetMode.RecoverOrDiscardUnsyncedChanges,
          onBefore: handlePreClientReset,
          onAfter: handlePostClientReset,
        },
        onError: handleSyncError,
        // We can specify the behavior when opening a Realm for the first time
        // (`newRealmFileBehavior`) and for subsequent ones (`existingRealmFileBehavior`).
        // If the user has logged in at least 1 time before, the Realm and its data will
        // exist on disk and can be opened even when offline. We can either (a) open the
        // Realm immediately (or first create a new empty Realm file if it does not
        // exist before opening it) and sync the data to the device in the background
        // (`OpenRealmBehaviorType.OpenImmediately`), or (b) wait for any non-synced
        // data to be fully downloaded (`OpenRealmBehaviorType.DownloadBeforeOpen`).
        newRealmFileBehavior: {
          type: OpenRealmBehaviorType.OpenImmediately,
        },
        existingRealmFileBehavior: {
          type: OpenRealmBehaviorType.OpenImmediately,
        },
      },
    };

    logger.info("Opening realm...");
    realm = await Realm.open(config);
    logger.info("Realm opened.");

    // Listen for changes to the connection.
    realm.syncSession?.addConnectionNotification(handleConnectionChange);

    // Listen for changes to the products at the given store ID.
    realm.objects(Product).filtered("storeId = $0", SYNC_STORE_ID).addListener(handleProductsChange);
    return realm;
  } catch (err: any) {
    logger.error(`Error opening the realm: ${err?.message}`);
    throw err;
  }
}

function closeRealm(): void {
  if (realm && !realm.isClosed) {
    // Explicitly removing the connection listener is not needed
    // if you intend for it to live throughout the session.
    realm.syncSession?.removeConnectionNotification(handleConnectionChange);

    logger.info("Closing the realm...");
    realm.close();
    logger.info("Realm closed.");
  }
  realm = null;
}

/**
 * The products collection listener - Will be invoked when the listener is added
 * and whenever an object in the collection is deleted, inserted, or modified.
 *
 * @note
 * Always handle potential deletions first.
 */
const handleProductsChange: CollectionChangeCallback<
  Product,
  [number, Product]
> = (collection, changes) => {
  if (changes.deletions.length) {
    logger.info(`Removed ${changes.deletions.length} product(s).`);
  }
  for (const insertedIndex of changes.insertions) {
    logger.info(`Product inserted: ${collection[insertedIndex].name}`);
  }
  for (const modifiedIndex of changes.newModifications) {
    logger.info(`Product modified: ${collection[modifiedIndex].name}`);
  }
}

export function getStore() {
  return realm?.objects(Store).filtered("_id = $0", SYNC_STORE_ID)[0];
  // or:       .objects<Store>(Store.schema.name, ..)
}

function getKiosks() {
  return realm ? realm.objects(Kiosk).filtered("storeId = $0", SYNC_STORE_ID) : [];
}

function getProducts() {
  return realm ? realm.objects(Product).filtered("storeId = $0", SYNC_STORE_ID) : [];
}

function addProducts() {
  realm?.write(() => {
    const NUM_PRODUCTS = 5;
    for (let i = 1; i <= NUM_PRODUCTS; i++) {
      realm?.create(Product, {
        _id: new BSON.ObjectId(),
        storeId: SYNC_STORE_ID,
        name: getRandomProductName(),
        price: parseFloat(getFloatBetween(3, 15).toFixed(2)),
        numInStock: getIntBetween(0, 100),
      });
    }
  });
}

function addKiosks() {
  realm?.write(() => {
    const NUM_KIOSKS = 3;
    for (let i = 1; i <= NUM_KIOSKS; i++) {
      realm?.create(Kiosk, {
        _id: new BSON.ObjectId(),
        storeId: SYNC_STORE_ID,
        products: [...getProducts()],
      });
    }
  });
}

function addStore() {
  realm?.write(() => {
    realm?.create(Store, {
      _id: SYNC_STORE_ID,
      kiosks: [...getKiosks()],
    });
  });
}

export function addDummyData() {
  addProducts();
  addKiosks();
  addStore();
}

export function updateDummyData() {
  const products = getProducts();
  // Updating products one-by-one (separate `write`s) to simulate
  // updates occurring in different batches.
  for (const product of products) {
    realm?.write(() => {
      product.numInStock = getIntBetween(0, 100);
    });
  }
}

export function deleteDummyData() {
  realm?.write(() => {
    logger.info("Deleting dummy data...");
    realm?.deleteAll();
  });
}

function handleExit(code: number): void {
  closeRealm();
  logger.info(`Exiting with code ${code}.`);
}

process.on("exit", handleExit);
process.on("SIGINT", process.exit);
