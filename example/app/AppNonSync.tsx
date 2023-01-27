import React, {useMemo} from 'react';

import {Task} from './models/Task';
import {TaskManager} from './components/TaskManager';

import {useQuery} from '@realm/react';

export const AppNonSync = () => {
  const result = useQuery(Task);

  const tasks = useMemo(() => result.sorted('createdAt'), [result]);

  return <TaskManager tasks={tasks} />;
};
