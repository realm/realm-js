import React from 'react';
import { Navigate } from 'react-router-dom';

import { Task } from './models/Task';
import { TaskScreen } from './screens/TaskScreen';
const { RealmProvider, UserProvider, useApp } = await import('@realm/react');

export function App() {
  const atlasApp = useApp();

  return (
    <div>
      {atlasApp.currentUser ? (
        <UserProvider>
          <RealmProvider
            schema={[Task]}
            sync={{
              flexible: true,
              initialSubscriptions: {
                update: ((mutableSubs, realm) => {
                  mutableSubs.add(realm.objects(Task), { name: 'allTasks' });
                }),
              },
            }}
          >
            <TaskScreen />
          </RealmProvider>
        </UserProvider>
      ) : (
        <Navigate to='login' replace={true}/>
      )}
    </div>
  );
}
