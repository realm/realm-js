import React, {useEffect, useMemo} from 'react';
import {useApp} from '@realm/react';
import {StyleSheet, Text} from 'react-native';

import {Task} from './models/Task';
import {TaskRealmContext} from './models';
import {TaskManager} from './components/TaskManager';

const {useRealm, useQuery} = TaskRealmContext;

type AppProps = {
  userId: string;
};

export const AppSync: React.FC<AppProps> = ({userId}) => {
  const realm = useRealm();
  const app = useApp();
  const result = useQuery(Task);

  const tasks = useMemo(() => result.sorted('createdAt'), [result]);

  useEffect(() => {
    realm.subscriptions.update(mutableSubs => {
      mutableSubs.add(result);
    });
  }, [realm, result]);

  return (
    <>
      <Text style={styles.idText}>Syncing with app id: {app.id}</Text>
      <TaskManager tasks={tasks} userId={userId} />
    </>
  );
};

const styles = StyleSheet.create({
  idText: {
    color: '#999',
    paddingHorizontal: 20,
  },
});
