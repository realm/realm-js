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

import React, {useState} from 'react';
import {StyleSheet, Switch, Text, View} from 'react-native';
import {useRealm} from '@realm/react';

export function OfflineModeButton() {
  const realm = useRealm();

  const [pauseSync, togglePauseSync] = useState(false);

  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleText}>Disable Sync</Text>
      <Switch
        onValueChange={() => {
          if (!pauseSync && realm.syncSession?.state === 'active') {
            realm.syncSession.pause();
            togglePauseSync(true);
          } else if (pauseSync && realm.syncSession?.state === 'inactive') {
            realm.syncSession.resume();
            togglePauseSync(false);
          }
        }}
        value={realm.syncSession?.state === 'inactive'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  icon: {padding: 12},
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  toggleText: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
});
