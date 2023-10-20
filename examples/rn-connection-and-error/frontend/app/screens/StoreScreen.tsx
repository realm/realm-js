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
import {Alert, FlatList, StyleSheet, Text, View} from 'react-native';
import {useAuth} from '@realm/react';

import {Button} from '../components/Button';
import {KioskItem} from '../components/KioskItem';
import {colors} from '../styles/colors';
import {fonts} from '../styles/fonts';
import {useDemoSyncTriggers} from '../hooks/useDemoSyncTriggers';
import {useStore} from '../providers/StoreProvider';

/**
 * Screen for showing the kiosks and products in the store,
 * as well as buttons for triggering various listeners.
 */
export function StoreScreen() {
  const {store, addStore, addKiosk, addProduct, updateProduct, removeProduct} =
    useStore();
  const {
    isConnected,
    reconnect,
    disconnect,
    triggerSyncError,
    triggerClientReset,
    refreshAccessToken,
    deleteUser,
  } = useDemoSyncTriggers();
  const {logOut} = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Store</Text>
          <Text style={styles.info}>ID: {store?._id.toHexString() || '-'}</Text>
        </View>
        <Button onPress={logOut} text="Log Out" />
      </View>
      {store ? (
        <>
          <View style={styles.store}>
            <FlatList
              data={store.kiosks}
              keyExtractor={kiosk => kiosk._id.toHexString()}
              renderItem={({item: kiosk}) => (
                <KioskItem
                  kiosk={kiosk}
                  updateProduct={updateProduct}
                  removeProduct={removeProduct}
                />
              )}
              ListEmptyComponent={<Text style={styles.info}>No kiosks</Text>}
            />
          </View>
          <View style={styles.triggers}>
            <View style={styles.status}>
              <Text style={styles.statusText}>
                Status: {isConnected ? 'Connected 🟢' : 'Not connected 🔴'}
              </Text>
              <Button
                isSecondary
                onPress={isConnected ? disconnect : reconnect}
                text={isConnected ? 'Disconnect' : 'Connect'}
              />
            </View>
            <View style={styles.triggerButtons}>
              <Button
                extraStyles={[styles.button]}
                onPress={addKiosk}
                text="Add Kiosk"
              />
              <Button
                extraStyles={[styles.button]}
                onPress={
                  store?.kiosks.length
                    ? addProduct
                    : () => Alert.alert('Add a kiosk first.')
                }
                text="Add Product"
              />
              <Button
                extraStyles={[styles.button]}
                onPress={triggerSyncError}
                text="Trigger Sync Error"
              />
              <Button
                extraStyles={[styles.button]}
                onPress={triggerClientReset}
                text="Trigger Client Reset"
              />
              <Button
                extraStyles={[styles.button]}
                onPress={refreshAccessToken}
                text="Refresh Access Token"
              />
              <Button
                extraStyles={[styles.button]}
                onPress={deleteUser}
                text="Delete User"
              />
            </View>
          </View>
        </>
      ) : (
        // No store has been created yet (or not yet loaded).
        <View style={styles.createStore}>
          <Button onPress={addStore} text="Create Your Store" />
          <Text style={styles.arrow}>⤴</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.grayLight,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 10,
    borderBottomWidth: 1,
    borderColor: colors.grayMedium,
    backgroundColor: colors.white,
  },
  createStore: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrow: {
    marginTop: 20,
    fontSize: 60,
  },
  store: {
    flex: 1,
    paddingTop: 10,
    paddingHorizontal: 20,
  },
  title: {
    textTransform: 'uppercase',
    fontFamily: fonts.primary,
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.grayDark,
  },
  info: {
    color: colors.grayDark,
  },
  triggers: {
    padding: 20,
    borderTopWidth: 1,
    borderColor: colors.grayMedium,
  },
  status: {
    marginBottom: 20,
    paddingHorizontal: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusText: {
    color: colors.grayDark,
  },
  triggerButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  button: {
    width: '40%',
    flexGrow: 1,
  },
});
