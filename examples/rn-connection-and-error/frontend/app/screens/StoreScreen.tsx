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
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Store</Text>
          <Text style={styles.subtitle}>ID: {store?._id.toHexString()}</Text>
        </View>
        <Button onPress={logOut} text="Log Out" />
      </View>
      <View style={styles.store}>
        {store?.kiosks ? (
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
          />
        ) : (
          <Text>Loading...</Text>
        )}
      </View>
      <View style={styles.triggersContainer}>
        <View style={styles.status}>
          <Text style={styles.statusText}>
            Status: {isConnected ? 'Connected 🟢' : 'Not connected 🔴'}
          </Text>
          <Button
            extraStyles={[styles.connectionButton]}
            onPress={isConnected ? disconnect : reconnect}
            text={isConnected ? 'Disconnect' : 'Connect'}
            textStyles={[styles.connectionText]}
          />
        </View>
        <View style={styles.triggers}>
          <Button
            extraStyles={[styles.button]}
            onPress={addKiosk}
            text="Add Kiosk"
          />
          <Button
            extraStyles={[styles.button]}
            onPress={addProduct}
            text="Add Product"
          />
          <Button
            extraStyles={[styles.button]}
            onPress={triggerSyncError}
            text="Session Error"
          />
          <Button
            extraStyles={[styles.button]}
            onPress={() => Alert.alert('TODO')}
            text="Client Reset"
          />
          <Button
            extraStyles={[styles.button]}
            onPress={refreshAccessToken}
            text="Refresh Access Token"
          />
        </View>
      </View>
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
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderColor: colors.grayMedium,
    backgroundColor: colors.white,
  },
  store: {
    flex: 1,
    padding: 20,
  },
  title: {
    textTransform: 'uppercase',
    fontFamily: fonts.primary,
    fontSize: 20,
    color: colors.grayDark,
  },
  subtitle: {
    color: colors.grayDark,
  },
  triggersContainer: {
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
  triggers: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  button: {
    margin: 5,
    flexGrow: 1,
  },
  connectionButton: {
    borderWidth: 1,
    borderColor: colors.blue,
    backgroundColor: colors.white,
  },
  connectionText: {
    color: colors.grayDark,
  },
});
