import React, {useCallback, useEffect, useMemo} from 'react';
import {useApp, useUser} from '@realm/react';
import {Pressable, StyleSheet, Text} from 'react-native';

import {Task} from './models/Task';
import {TaskManager} from './components/TaskManager';
import {buttonStyles} from './styles/button';
import {shadows} from './styles/shadows';
import colors from './styles/colors';
import {OfflineModeButton} from './components/OfflineModeButton';

import {useRealm, useQuery} from '@realm/react';

export const AppSync: React.FC = () => {
  const realm = useRealm();
  const user = useUser();
  const app = useApp();
  const result = useQuery(Task);

  const tasks = useMemo(() => result.sorted('createdAt'), [result]);

  useEffect(() => {
    realm.subscriptions.update(mutableSubs => {
      mutableSubs.add(result);
    });
  }, [realm, result]);

  const handleLogout = useCallback(() => {
    user.logOut();
  }, [user]);

  return (
    <>
      <Text style={styles.idText}>Syncing with app id: {app.id}</Text>
      <TaskManager tasks={tasks} userId={user?.id} />
      <Pressable style={styles.authButton} onPress={handleLogout}>
        <Text
          style={styles.authButtonText}>{`Logout ${user?.profile.email}`}</Text>
      </Pressable>
      <OfflineModeButton />
    </>
  );
};

const styles = StyleSheet.create({
  idText: {
    color: '#999',
    paddingHorizontal: 20,
  },
  authButton: {
    ...buttonStyles.button,
    ...shadows,
    backgroundColor: colors.purpleDark,
  },
  authButtonText: {
    ...buttonStyles.text,
  },
});
