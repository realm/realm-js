import React, {useEffect, useMemo} from 'react';

import TaskContext, {Task} from './models/Task';
import {TaskManager} from './components/TaskManager';

const {useRealm, useQuery} = TaskContext;

type AppProps = {
  onLogin?: () => void;
  onLogout?: () => void;
  currentUserId: string;
  currentUserName?: string;
};

export const AppSync: React.FC<AppProps> = ({currentUserId}) => {
  const realm = useRealm();
  const result = useQuery(Task);

  const tasks = useMemo(() => result.sorted('createdAt'), [result]);

  useEffect(() => {
    realm.subscriptions.update(mutableSubs => {
      mutableSubs.add(result);
    });
  }, [realm, result]);

  return <TaskManager tasks={tasks} userId={currentUserId} />;
};
