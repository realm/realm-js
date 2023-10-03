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
import { OpenRealmBehaviorType } from 'realm';
import { RealmProvider, UserProvider } from '@realm/react';

import { Task } from './models/Task';
import { PageLayout } from './components/PageLayout';

/**
 * The part of the React tree having access to an authenticated user. It
 * renders `@realm/react`'s `UserProvider` for providing the App User once
 * authenticated and `RealmProvider` for opening a Realm.
 */
export function AuthenticatedApp() {
  return (
    // The component set as the `fallback` prop will be rendered if a user has
    // not been authenticated. In this case, we will navigate the user to the
    // unauthenticated route via the `Navigate` component. Once authenticated,
    // `RealmProvider` will have access to the user and set it in the Realm
    // configuration; therefore, you don't have to explicitly provide it here.
    <UserProvider fallback={<Navigate to='/' />}>
      <RealmProvider
        schema={[Task]}
        sync={{
          flexible: true,
          // To sync data to the device, we need to subscribe to our tasks.
          initialSubscriptions: {
            update: ((mutableSubs, realm) => {
              mutableSubs.add(realm.objects(Task), { name: 'allTasks' });
            }),
          },
          // We can specify the behavior when opening a Realm for the first time
          // (`newRealmFileBehavior`) and for subsequent ones (`existingRealmFileBehavior`).
          // If the user has logged in at least 1 time before, the Realm and its data will
          // exist on disk and can be opened even when offline. We can either (a) open the
          // Realm immediately (or first create a new empty Realm file if it does not
          // exist before opening it) and sync the data to the device in the background
          // (`OpenRealmBehaviorType.OpenImmediately`), or (b) wait for any non-synced
          // data to be fully downloaded (`OpenRealmBehaviorType.DownloadBeforeOpen`).
          // For more possible configurations of new and existing Realm file behaviors, see:
          // https://www.mongodb.com/docs/realm-sdks/js/latest/types/OpenRealmBehaviorConfiguration.html
          newRealmFileBehavior: {
            type: OpenRealmBehaviorType.OpenImmediately,
          },
          existingRealmFileBehavior: {
            type: OpenRealmBehaviorType.OpenImmediately,
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
