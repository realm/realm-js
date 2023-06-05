import React from 'react';

import { TaskContext } from './hooks/useTaskManager';
import { TaskScreen } from './screens/TaskScreen';

const { RealmProvider } = TaskContext;

function App() {
  return (
    <div>
      {/* TODO: Show login screen if not authenticated */}
      <RealmProvider>
        <TaskScreen />
      </RealmProvider>
    </div>
  );
}

export default App;
