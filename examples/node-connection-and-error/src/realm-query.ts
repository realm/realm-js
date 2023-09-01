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

import { BSON } from "realm";

import { SYNC_STORE_ID } from "./atlas-app-services/config";
import { Store } from "./models/Store";
import { Kiosk } from "./models/Kiosk";
import { Product } from "./models/Product";
import { getRealm } from "./realm-auth";

export function getStore() {
  return getRealm()?.objects(Store).filtered("_id = $0", SYNC_STORE_ID)[0];
  // or:            .objects<Store>(Store.schema.name, ..)
}

function getKiosks() {
  const realm = getRealm();
  return realm ? realm.objects(Kiosk).filtered("storeId = $0", SYNC_STORE_ID) : [];
}

function getProducts() {
  const realm = getRealm();
  return realm ? realm.objects(Product).filtered("storeId = $0", SYNC_STORE_ID) : [];
}

function addProducts() {
  const realm = getRealm();
  realm?.write(() => {
    const NUM_PRODUCTS = 10;
    for (let i = 1; i <= NUM_PRODUCTS; i++) {
      const randomPrice = parseFloat((5 + Math.random() * 10).toFixed(2));
      realm.create(Product, { // Or: `realm.create<Product>(Product.schema.name, ..)`
        _id: new BSON.ObjectId(),
        storeId: SYNC_STORE_ID,
        name: `product${i}`,
        price: randomPrice,
        numInStock: NUM_PRODUCTS,
      });
    }
  });
}

function addKiosks() {
  const realm = getRealm();
  const products = getProducts();
  realm?.write(() => {
    const NUM_KIOSKS = 10;
    for (let i = 1; i <= NUM_KIOSKS; i++) {
      realm.create(Kiosk.schema.name, {
        _id: new BSON.ObjectId(),
        storeId: SYNC_STORE_ID,
        products,
      });
    }
  });
}

function addStore() {
  const realm = getRealm();
  const kiosks = getKiosks();
  realm?.write(() => {
    realm.create(Store.schema.name, {
      _id: SYNC_STORE_ID,
      kiosks,
    });
  });
}

export function addDummyData() {
  addProducts();
  addKiosks();
  addStore();
}

export function updateDummyData() {
  const realm = getRealm();
  const products = getProducts();
  // Updating products one-by-one (separate `write`s) to simulate
  // updates occurring in different batches.
  for (const product of products) {
    realm?.write(() => {
      // Decrease the `numInStock` by 0, 1, 2, or 3
      const decrease = Math.round(Math.random() * 3);
      product.numInStock = Math.max(0, product.numInStock - decrease);
    });
  }
}

export function deleteDummyData() {
  const realm = getRealm();
  if (realm) {
    realm.write(() => {
      realm.deleteAll();
    });
  }
}
