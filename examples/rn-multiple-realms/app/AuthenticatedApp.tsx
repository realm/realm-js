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

import React from 'react';
import {OpenRealmBehaviorType, SyncConfiguration} from 'realm';
import {RealmProvider} from '@realm/react';

import {Movie} from './models/Movie';
import {MovieProvider} from './providers/MovieProvider';
import {RootNavigator} from './navigation/RootNavigator';
import {useAccountInfo} from './hooks/useAccountInfo';

// Define the Realm sync configuration that will be passed to `RealmProvider`.
const realmSyncConfig: Partial<SyncConfiguration> = {
  flexible: true,
  initialSubscriptions: {
    update: (mutableSubs, realm) => {
      // In order to sync a preferred subset of movies to the device, we subscribe to all
      // movies from 2005 and later that has the `poster` and `fullplot` fields defined.
      mutableSubs.add(
        realm
          .objects(Movie)
          .filtered(
            'type == "movie" AND year >= 2005 AND poster != nil AND fullplot != nil',
          ),
        {name: 'allMovies'},
      );
    },
  },
  // We can specify the behavior when opening a realm for the first time
  // (`newRealmFileBehavior`) and for subsequent ones (`existingRealmFileBehavior`).
  // If the user has logged in at least 1 time before, the realm and its data will
  // exist on disk and can be opened even when offline. We can either create a new
  // empty realm file and sync the data to the device in the background
  // (`OpenRealmBehaviorType.OpenImmediately`), or wait for the data to be fully
  // synced (`OpenRealmBehaviorType.DownloadBeforeOpen`).
  newRealmFileBehavior: {
    type: OpenRealmBehaviorType.OpenImmediately,
  },
  existingRealmFileBehavior: {
    type: OpenRealmBehaviorType.OpenImmediately,
  },
};

export function AuthenticatedApp() {
  const {isPublicAccount} = useAccountInfo();

  return (
    <RealmProvider
      schema={[Movie]}
      sync={realmSyncConfig}
      path={
        // `path` is optional and does not always need to be defined; however, for
        // this example app, we use a different realm depending on whether the account
        // is public. Users that log in using email and password will be treated
        // as private accounts with the ability to sync content saved to `My List`.
        isPublicAccount ? 'public' : 'private'
      }>
      <MovieProvider>
        <RootNavigator />
      </MovieProvider>
    </RealmProvider>
  );
}
