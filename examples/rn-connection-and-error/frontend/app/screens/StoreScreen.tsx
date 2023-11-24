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
import {Loading} from '../components/Loading';
import {StatusBar} from '../components/StatusBar';
import {colors} from '../styles/colors';
import {fonts} from '../styles/fonts';
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
    triggerSyncError,
    triggerClientReset,
    refreshAccessToken,
    refreshSession,
    switchStore,
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
            <StatusBar />
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
                onPress={deleteUser}
                text="Delete User"
              />
              <Button
                extraStyles={[styles.button]}
                onPress={() => {
                  switchStore();
                  Alert.alert(
                    'The associated store has been changed. Click "Refresh User Data" to update the UI.',
                  );
                }}
                text="Trigger Store Change"
              />
              <Button
                extraStyles={[styles.button]}
                onPress={refreshAccessToken}
                text="Refresh Access Token / User Data"
              />
              <Button
                extraStyles={[styles.button]}
                onPress={refreshSession}
                text="Refresh Session"
              />
            </View>
          </View>
        </>
      ) : (
        // Store isn't yet loaded, perhaps while switching stores.
        <View style={styles.loading}>
          <Loading />
          <StatusBar />
          <Text style={styles.helperText}>
            Press button below if stuck at loading.
          </Text>
          <Button onPress={refreshAccessToken} text="Refresh User Data" />
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
  triggerButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  button: {
    width: '40%',
    flexGrow: 1,
  },
  loading: {
    flex: 1,
    paddingHorizontal: 20,
  },
  helperText: {
    marginBottom: 20,
    textAlign: 'center',
    color: colors.grayDark,
  },
});
