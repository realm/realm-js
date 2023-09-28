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

import React from 'react';
import {FlatList, StyleSheet, Text, View} from 'react-native';
import {useAuth} from '@realm/react';

import {Button} from '../components/Button';
import {ProductItem} from '../components/ProductItem';
import {useDemoSyncTriggers} from '../hooks/useDemoSyncTriggers';
import {useStore} from '../providers/StoreProvider';

/**
 * Screen for showing the kiosks and products in the store,
 * as well as buttons for triggering various listeners.
 */
export function StoreScreen() {
  const {store, addKiosk, addProduct, updateProduct, removeProduct} =
    useStore();
  const {
    isConnected,
    reconnect,
    disconnect,
    triggerSyncError,
    refreshAccessToken,
  } = useDemoSyncTriggers();
  const {logOut} = useAuth();

  return (
    // TODO: Update
    <View style={styles.container}>
      <View style={styles.store}>
        <View style={styles.header}>
          <Button onPress={logOut} text="Log Out" />
        </View>
        {store?.kiosks[0]?.products.length ? (
          <FlatList
            data={store.kiosks[0].products}
            keyExtractor={product => product._id.toHexString()}
            renderItem={({item: product}) => (
              <ProductItem
                product={product}
                update={updateProduct}
                remove={removeProduct}
              />
            )}
          />
        ) : (
          <Text>Loading...</Text>
        )}
      </View>
      <View style={styles.triggers}>
        <Button onPress={addProduct} text="Add Product" />
        <Button onPress={addKiosk} text="Add Kiosk" />
        <Button onPress={triggerSyncError} text="Session Error" />
        <Button onPress={refreshAccessToken} text="Refresh Access Token" />
        {isConnected ? (
          <Button onPress={disconnect} text="Disconnect" />
        ) : (
          <Button onPress={reconnect} text="Connect" />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  store: {
    flex: 1,
  },
  header: {
    height: 50,
    borderBottomWidth: 1,
    borderColor: 'black',
  },
  triggers: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    padding: 10,
    borderTopWidth: 1,
    borderColor: 'black',
  },
});
