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
import {useObject, useQuery, useRealm} from '@realm/react';

import {SYNC_STORE_ID} from '../atlas-app-services/config';
import {Kiosk} from '../models/Kiosk';
import {Product, getRandomProductName} from '../models/Product';
import {Store} from '../models/Store';

/**
 * Value available to consumers of the `StoreContext`.
 */
type StoreContextType = {
  store: Store | null;
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
  const store = useObject(Store, SYNC_STORE_ID);
  const products = useQuery(Product);

  /**
   * Add a kiosk to the store, containing all products in that store.
   */
  const addKiosk = useCallback(() => {
    realm.write(() => {
      const kiosk = realm.create(Kiosk, {
        _id: new BSON.ObjectId(),
        storeId: SYNC_STORE_ID,
      });
      for (const product of products) {
        kiosk.products.push(product);
      }
      store?.kiosks.push(kiosk);
    });
  }, [realm, store, products]);

  /**
   * Add a product and then add it to all kiosks in the store.
   */
  const addProduct = useCallback(() => {
    realm.write(() => {
      const randomPrice = parseFloat((5 + Math.random() * 10).toFixed(2));
      const product = realm.create(Product, {
        _id: new BSON.ObjectId(),
        storeId: SYNC_STORE_ID,
        name: getRandomProductName(),
        price: randomPrice,
        numInStock: products.length + 1,
      });
      for (const kiosk of store?.kiosks || []) {
        kiosk.products.push(product);
      }
    });
  }, [realm, store, products.length]);

  /**
   * Update a product by changing the number in stock.
   */
  const updateProduct = useCallback(
    (product: Product) => {
      realm.write(() => {
        product.numInStock = Math.round(Math.random() * 10);
      });
    },
    [realm],
  );

  /**
   * Remove a product from the store.
   *
   * @note
   * This removes it from the database, rather than setting the number
   * in stock to 0.
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
  > = useCallback((products, changes) => {
    if (changes.deletions.length) {
      console.info(`Removed ${changes.deletions.length} product(s).`);
    }
    for (const insertedIndex of changes.insertions) {
      console.info(`Product inserted: ${products[insertedIndex].name}`);
    }
    for (const modifiedIndex of changes.newModifications) {
      console.info(`Product modified: ${products[modifiedIndex].name}`);
    }
  }, []);

  const listenForProductsChange = useCallback(() => {
    products.addListener(handleProductsChange);
  }, [products, handleProductsChange]);

  const removeListeners = useCallback(() => {
    products.removeAllListeners();
  }, [products]);

  useEffect(() => {
    listenForProductsChange();

    // Remove listeners on unmount.
    return removeListeners;
  }, []);

  const contextValue = {
    store,
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
