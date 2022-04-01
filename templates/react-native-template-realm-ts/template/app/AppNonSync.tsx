import React, {useMemo} from 'react';

import TaskContext, {Task} from './models/Task';
import {TaskManager} from './components/TaskManager';

const {useQuery} = TaskContext;

export const AppNonSync = () => {
  const result = useQuery(Task);

  const tasks = useMemo(() => result.sorted('createdAt'), [result]);

  return <TaskManager tasks={tasks} />;
};
