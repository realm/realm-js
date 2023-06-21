import React from 'react';

import {Task} from './models/Task';
import {TaskManager} from './components/TaskManager';

import {useQuery} from '@realm/react';

export const AppNonSync = () => {
  const [showDone, setShowDone] = React.useState(false);
  const tasks = useQuery(
    Task,
    collection =>
      showDone
        ? collection.sorted('createdAt')
        : collection.filtered('isComplete == false').sorted('createdAt'),
    [showDone],
  );

  return (
    <TaskManager tasks={tasks} setShowDone={setShowDone} showDone={showDone} />
  );
};
