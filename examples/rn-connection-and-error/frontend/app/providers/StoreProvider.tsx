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

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import type {PropsWithChildren} from 'react';
import {
  BSON,
  CollectionChangeCallback,
  ConnectionState,
  UserState,
} from 'realm';
import {useObject, useQuery, useRealm, useUser} from '@realm/react';

import {SYNC_STORE_ID} from '../atlas-app-services/config';
import {Kiosk} from '../models/Kiosk';
import {Product, getRandomProductName} from '../models/Product';
import {Store} from '../models/Store';

/**
 * Values available to consumers of the `StoreContext`.
 */
type StoreContextType = {
  store: Store | null;
  addKiosk: () => void;
  addProduct: () => void;
  updateProduct: (product: Product) => void;
  removeProduct: (product: Product) => void;
  isConnected: boolean;
  reconnect: () => void;
  disconnect: () => void;
  triggerSyncError: () => void;
  refreshAccessToken: () => Promise<void>;
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
  isConnected: true,
  reconnect: () => {},
  disconnect: () => {},
  triggerSyncError: () => {},
  refreshAccessToken: async () => {},
});

/**
 * Queries and provides the relevant store using `@realm/react`, as well
 * as adding listeners and providing functions for adding, updating, and
 * removing products in the store.
 */
export function StoreProvider({children}: PropsWithChildren) {
  const realm = useRealm();
  const currentUser = useUser();
  const store = useObject(Store, SYNC_STORE_ID);
  const products = useQuery(Product);
  const [isConnected, setIsConnected] = useState(true);
  // The original access token is stored in order to detect if
  // the token has been refreshed (see `handleUserEventChange`).
  const [originalAccessToken, setOriginalAccessToken] = useState(
    () => currentUser.accessToken,
  );

  /**
   * Adds a kiosk to the store, containing all products in that store.
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
   * Adds a product and then adds it to all kiosks in the store.
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
   * Updates a product by changing the number in stock.
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
   * Removes a product from the store.
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

  /**
   * The connection listener - Will be invoked when the the underlying sync
   * session changes its connection state.
   */
  const handleConnectionChange = useCallback(
    (newState: ConnectionState, oldState: ConnectionState) => {
      const connecting = newState === ConnectionState.Connecting;
      const connected = newState === ConnectionState.Connected;
      const disconnected =
        oldState === ConnectionState.Connected &&
        newState === ConnectionState.Disconnected;
      const failedReconnecting =
        oldState === ConnectionState.Connecting &&
        newState === ConnectionState.Disconnected;

      if (connecting) {
        console.info('Connecting...');
      } else if (connected) {
        console.info('Connected.');
      } else if (disconnected) {
        console.info('Disconnected.');

        // At this point, the `newState` is `ConnectionState.Disconnected`. Automatic retries
        // will start and the state will alternate in the following way for the period where
        // there is NO network connection:
        //    (1) oldState: ConnectionState.Disconnected, newState: ConnectionState.Connecting
        //    (2) oldState: ConnectionState.Connecting, newState: ConnectionState.Disconnected

        // Calling `App.Sync.Session.reconnect()` is not needed due to automatic retries.

        // Be aware of that there may be a delay from the time of actual disconnect until this
        // listener is invoked.
      } /* failedReconnecting */ else {
        console.info('Failed to reconnect.');
      }

      setIsConnected(connected);
    },
    [],
  );

  const listenForConnectionChange = useCallback(() => {
    realm.syncSession?.addConnectionNotification(handleConnectionChange);
  }, [realm, handleConnectionChange]);

  /**
   * Trigger the connection listener by reconnecting to the sync session.
   */
  const reconnect = useCallback(() => {
    realm.syncSession?.resume();
  }, [realm]);

  /**
   * Trigger the connection listener by disconnecting from the sync session.
   */
  const disconnect = useCallback(() => {
    realm.syncSession?.pause();
  }, [realm]);

  /**
   * Trigger the sync error listener by trying to create a `Store` that
   * is outside of the query filter subscribed to. Since we subscribed
   * to the store with a given ID (see `App.tsx`), attempting to create
   * one with a different ID will generate a sync error.
   */
  const triggerSyncError = useCallback(() => {
    realm.write(() => {
      const NON_SUBSCRIBED_STORE_ID = new BSON.ObjectId();
      realm.create(Store, {_id: NON_SUBSCRIBED_STORE_ID});
    });
  }, [realm]);

  /**
   * The user listener - Will be invoked on various user related events including
   * refresh of auth token, refresh token, custom user data, removal, and logout.
   */
  const handleUserEventChange = useCallback(() => {
    // Currently we don't provide any arguments to this callback but we have opened
    // a ticket for this (see https://github.com/realm/realm-core/issues/6454). To
    // detect that a token has been refreshed, the original access token can be saved
    // to a variable and compared against the current one.
    if (originalAccessToken !== currentUser.accessToken) {
      console.info('Refreshed access token.');
      setOriginalAccessToken(currentUser.accessToken);
    }

    switch (currentUser.state) {
      case UserState.LoggedIn:
        console.info(`User (id: ${currentUser.id}) has been authenticated.`);
        break;
      case UserState.LoggedOut:
        console.info(`User (id: ${currentUser.id}) has been logged out.`);
        break;
      case UserState.Removed:
        console.info(
          `User (id: ${currentUser.id}) has been removed from the app.`,
        );
        break;
      default:
        // Should not be reachable.
        break;
    }
  }, [currentUser, originalAccessToken]);

  const listenForUserEventChange = useCallback(() => {
    currentUser.addListener(handleUserEventChange);
  }, [currentUser, handleUserEventChange]);

  /**
   * Trigger the user event listener by refreshing the custom user data
   * and thereby the access token.
   */
  const refreshAccessToken = useCallback(async () => {
    await currentUser.refreshCustomData();
  }, [currentUser]);

  const removeListeners = useCallback(() => {
    realm.syncSession?.removeConnectionNotification(handleConnectionChange);
    currentUser.removeAllListeners();
    products.removeAllListeners();
  }, [realm, currentUser, products, handleConnectionChange]);

  useEffect(() => {
    // TODO: Possibly add a state for seeing if the listener have
    // been added so that listeners are not added multiple times.
    listenForConnectionChange();
    listenForUserEventChange();
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
    isConnected,
    reconnect,
    disconnect,
    triggerSyncError,
    refreshAccessToken,
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
