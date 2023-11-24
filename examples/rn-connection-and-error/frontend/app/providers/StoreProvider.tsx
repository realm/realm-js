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
import {useObject, useQuery, useRealm, useUser} from '@realm/react';

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
  const user = useUser<{}, {storeId: BSON.ObjectId}, {}>();
  // Query the store matching the store ID saved in the current user's
  // custom user data document. The store has been created via an Atlas
  // Function on the backend, thus this component is not demonstrating
  // how to create a store via the client. (To see an example of inserting
  // into the database from the client, see `addKiosk()` or `addProduct()`).
  const store = useObject(Store, user.customData.storeId);
  const products = useQuery(Product);

  /**
   * Adds a kiosk to the store, containing all products in that store.
   */
  const addKiosk = useCallback(() => {
    realm.write(() => {
      const kiosk = realm.create(Kiosk, {
        _id: new BSON.ObjectId(),
        storeId: user.customData.storeId,
        products: [...products],
      });
      store?.kiosks.push(kiosk);
    });
  }, [realm, store, products, user]);

  /**
   * Adds a product and then adds it to all kiosks in the store.
   */
  const addProduct = useCallback(() => {
    realm.write(() => {
      const product = realm.create(Product, {
        _id: new BSON.ObjectId(),
        storeId: user.customData.storeId,
        name: getRandomProductName(),
        price: parseFloat(getFloatBetween(3, 15).toFixed(2)),
        numInStock: getIntBetween(0, 100),
      });
      for (const kiosk of store?.kiosks || []) {
        kiosk.products.push(product);
      }
    });
  }, [realm, store, user]);

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

  useEffect(() => {
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
    };
    // Since the `products` Results returned by `useQuery()` will update its
    // reference whenever there are changes in the collection, we add the
    // listener to `realm.objects(Product)` instead of the `products` variable.
    // Otherwise, the ESLint rules would require this `useEffect()` to add
    // `products` as a dependency which is not our desired behavior as it
    // would keep adding and removing the listener on each product update.
    const nonChangingProductsRef = realm.objects(Product);
    nonChangingProductsRef.addListener(handleProductsChange);

    return () => nonChangingProductsRef.removeListener(handleProductsChange);
  }, [realm]);

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
