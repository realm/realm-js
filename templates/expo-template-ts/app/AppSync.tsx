import React, {useEffect, useMemo} from 'react';

import {Task} from './models/Task';
import {TaskRealmContext} from './models';
import {TaskManager} from './components/TaskManager';

const {useRealm, useQuery} = TaskRealmContext;

type AppProps = {
  userId: string;
};

export const AppSync: React.FC<AppProps> = ({userId}) => {
  const realm = useRealm();
  const result = useQuery(Task);

  const tasks = useMemo(() => result.sorted('createdAt'), [result]);

  useEffect(() => {
    realm.subscriptions.update(mutableSubs => {
      mutableSubs.add(result);
    });
  }, [realm, result]);

  return <TaskManager tasks={tasks} userId={userId} />;
};
