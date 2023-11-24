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
import {StyleSheet, Text, View} from 'react-native';

import {Button} from './Button';
import {colors} from '../styles/colors';
import {useDemoSyncTriggers} from '../hooks/useDemoSyncTriggers';

/**
 * A status bar showing the connection status and a button
 * for disconnecting and reconnecting.
 */
export function StatusBar() {
  const {isConnected, disconnect, reconnect} = useDemoSyncTriggers();

  return (
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
  );
}

const styles = StyleSheet.create({
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
});
