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

import React, {createContext, useCallback, useContext, useEffect} from 'react';
import type {PropsWithChildren} from 'react';
import {BSON, CollectionChangeCallback} from 'realm';
import {useQuery, useRealm} from '@realm/react';

import {SYNC_STORE_ID} from '../atlas-app-services/config';
import {Kiosk} from '../models/Kiosk';
import {Product, getRandomProductName} from '../models/Product';
import {Store} from '../models/Store';
import {getFloatBetween, getIntBetween} from '../utils/random';
import {logger} from '../utils/logger';

/**
 * Values available to consumers of the `StoreContext`.
 */
type StoreContextType = {
  store: Store | null;
  addStore: () => void;
  addKiosk: () => void;
  addProduct: () => void;
  updateProduct: (product: Product) => void;
  removeProduct: (product: Product) => void;
};

/**
 * The store context with initial values.
 */
const StoreContext = createContext<StoreContextType>({
  store: null,
  addStore: () => {},
  addKiosk: () => {},
  addProduct: () => {},
  updateProduct: () => {},
  removeProduct: () => {},
});

/**
 * Queries and provides the relevant store using `@realm/react`, as well
 * as adding listeners and providing functions for adding, updating, and
 * removing products in the store.
 */
export function StoreProvider({children}: PropsWithChildren) {
  const realm = useRealm();
  const store = useQuery(Store)[0];
  const products = useQuery(Product);

  /**
   * Adds a store. This demo app is syncing and using only 1 store with a
   * specific store ID (see `app/atlas-app-services/config.ts`). Thus, if this
   * store has already been created, this function will return immediately.
   */
  const addStore = useCallback(() => {
    if (store) {
      return;
    }
    realm.write(() => {
      realm.create(Store, {_id: SYNC_STORE_ID});
    });
  }, [realm, store]);

  /**
   * Adds a kiosk to the store, containing all products in that store.
   */
  const addKiosk = useCallback(() => {
    realm.write(() => {
      const kiosk = realm.create(Kiosk, {
        _id: new BSON.ObjectId(),
        storeId: SYNC_STORE_ID,
        products: [...products],
      });
      store?.kiosks.push(kiosk);
    });
  }, [realm, store, products]);

  /**
   * Adds a product and then adds it to all kiosks in the store.
   */
  const addProduct = useCallback(() => {
    realm.write(() => {
      const product = realm.create(Product, {
        _id: new BSON.ObjectId(),
        storeId: SYNC_STORE_ID,
        name: getRandomProductName(),
        price: parseFloat(getFloatBetween(3, 15).toFixed(2)),
        numInStock: getIntBetween(0, 100),
      });
      for (const kiosk of store?.kiosks || []) {
        kiosk.products.push(product);
      }
    });
  }, [realm, store]);

  /**
   * Updates a product by changing the number in stock.
   */
  const updateProduct = useCallback(
    (product: Product) => {
      realm.write(() => {
        product.numInStock = getIntBetween(0, 100);
      });
    },
    [realm],
  );

  /**
   * Removes a product from the store.
   *
   * @note
   * This removes it from the database completely, rather than setting the
   * number in stock to 0.
   */
  const removeProduct = useCallback(
    (product: Product) => {
      realm.write(() => realm.delete(product));
    },
    [realm],
  );

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
    /* eslint-disable-next-line @typescript-eslint/no-shadow */
  > = useCallback((products, changes) => {
    if (changes.deletions.length) {
      logger.info(`Removed ${changes.deletions.length} product(s).`);
    }
    for (const insertedIndex of changes.insertions) {
      logger.info(`Product inserted: ${products[insertedIndex].name}`);
    }
    for (const modifiedIndex of changes.newModifications) {
      logger.info(`Product modified: ${products[modifiedIndex].name}`);
    }
  }, []);

  useEffect(() => {
    products.addListener(handleProductsChange);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  const contextValue = {
    store,
    addStore,
    addKiosk,
    addProduct,
    updateProduct,
    removeProduct,
  };

  return (
    <StoreContext.Provider value={contextValue}>
      {children}
    </StoreContext.Provider>
  );
}

/**
 * @returns The context value of the `StoreContext.Provider`.
 */
export const useStore = () => useContext(StoreContext);
