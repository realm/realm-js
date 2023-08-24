import { BSON } from "realm";

import { Store, StoreSchema } from "./models/Store";
import { Kiosk, KioskSchema } from "./models/Kiosk";
import { Product, ProductSchema } from "./models/Product";
import { SYNC_STORE_ID } from "./atlas-app-services/config";
import { getRealm } from "./realm-auth";

export function getStore() {
  return getRealm()?.objects<Store>(StoreSchema.name).filtered("_id = $0", SYNC_STORE_ID)[0];
}

function getKiosks() {
  const realm = getRealm();
  return realm ? realm.objects<Kiosk>(KioskSchema.name).filtered("storeId = $0", SYNC_STORE_ID) : [];
}

function getProducts() {
  const realm = getRealm();
  return realm ? realm.objects<Product>(ProductSchema.name).filtered("storeId = $0", SYNC_STORE_ID) : [];
}

function addProducts() {
  const realm = getRealm();
  if (realm) {
    realm.write(() => {
      const NUM_PRODUCTS = 10;
      for (let i = 1; i <= NUM_PRODUCTS; i++) {
        realm.create(ProductSchema.name, {
          _id: new BSON.ObjectId(),
          storeId: SYNC_STORE_ID,
          name: `product${i}`,
          price: parseFloat((5 + Math.random() * 10).toFixed(2)),
          numInStock: NUM_PRODUCTS
        });
      }
    });
  }
}

function addKiosks() {
  const realm = getRealm();
  if (realm) {
    const products = getProducts();
    realm.write(() => {
      for (let i = 1; i <= 10; i++) {
        realm.create(KioskSchema.name, {
          _id: new BSON.ObjectId(),
          storeId: SYNC_STORE_ID,
          products,
        });
      }
    });
  }
}

function addStore() {
  const realm = getRealm();
  if (realm) {
    const kiosks = getKiosks();
    realm.write(() => {
      realm.create(StoreSchema.name, {
        _id: SYNC_STORE_ID,
        kiosks,
      });
    });
  }
}

export function addDummyData() {
  addProducts();
  addKiosks();
  addStore();
}

export function updateDummyData() {
  const realm = getRealm();
  if (realm) {
    const products = getProducts();
    // Updating products one-by-one (separate `write`s) to simulate
    // updates occurring in different batches.
    for (const product of products) {
      realm.write(() => {
        // Decrease the `numInStock` by 0, 1, 2, or 3
        const decrease = Math.round(Math.random() * 3);
        product.numInStock = Math.max(0, product.numInStock - decrease);
      });
    }
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
