import { Navigate, Outlet } from 'react-router-dom';

import { Task } from './models/Task';
import { PageLayout } from './components/PageLayout';

const { RealmProvider, UserProvider, useApp } = await import('@realm/react');

export function App() {
  const atlasApp = useApp();
  if (!atlasApp.currentUser) {
    return <Navigate to='/' />
  }

  return (
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
        <PageLayout>
          <Outlet />
        </PageLayout>
      </RealmProvider>
    </UserProvider>
  );
}
