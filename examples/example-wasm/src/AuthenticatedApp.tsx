////////////////////////////////////////////////////////////////////////////
//
// Copyright 2023 Realm Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
////////////////////////////////////////////////////////////////////////////

import { Navigate, Outlet } from 'react-router-dom';

import { Task } from './models/Task';
import { PageLayout } from './components/PageLayout';

const { RealmProvider, UserProvider } = await import('@realm/react');

export function AuthenticatedApp() {
  // The component set as the `fallback` prop will be rendered if a user has
  // not been authenticated. In this case, we will navigate the user to the
  // unauthenticated route via the `Navigate` component. Once authenticated,
  // `RealmProvider` will have access to the user and set it in the Realm
  // configuration; therefore, you don't have to explicitly provide it here.
  return (
    <UserProvider fallback={<Navigate to='/' />}>
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
