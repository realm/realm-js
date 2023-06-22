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
