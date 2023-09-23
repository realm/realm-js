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
import type Realm from 'realm';
import {OpenRealmBehaviorType} from 'realm';
import {RealmProvider} from '@realm/react';

import {Movie} from './models/Movie';
import {MovieProvider} from './providers/MovieProvider';
import {PrivateContent} from './models/PrivateContent';
import {RootNavigator} from './navigation/RootNavigator';
import {useAccountInfo} from './hooks/useAccountInfo';

/**
 * Gets all movies from 2005 and later that has a poster and full plots.
 * This query is used in the Realm sync config's `initialSubscriptions`.
 */
function getMoviesQuery(realm: Realm): Realm.Results<Movie> {
  return realm
    .objects(Movie)
    .filtered(
      'type == "movie" AND year >= 2005 AND poster != nil AND fullplot != nil',
    );
}

/**
 * The part of the React tree that has access to an App User by having
 * logged in using any auth provider (e.g. anonymous or email/password).
 * This component renders the `RealmProvider` and will open different Realms
 * depending on whether or not the account is public/anonymous. Users that
 * log in using email and password will be treated as private accounts with
 * the ability to sync, read, add, and remove content saved to `My List`.
 *
 * @note
 * This example is using `RealmProvider` only in this component but with
 * different configurations for the different Realms. You may also have
 * `RealmProvider`s in different parts of the React tree, specifying different
 * `path`s in order to have multiple Realms open at the same time.
 */
export function AuthenticatedApp() {
  const {isPublicAccount, userId} = useAccountInfo();

  return (
    // Define the Realm configuration as props passed to `RealmProvider`.
    // Note that `user` does not need to be defined in the `sync` config
    // since the `RealmProvider` will set it for you once authenticated.
    <RealmProvider
      schema={[Movie, PrivateContent]}
      sync={{
        flexible: true,
        // To sync a preferred subset of data to the device, we subscribe to movies.
        // If the account is private, we not only subscribe to the movies, but also
        // to the private content, such as the movies the user has saved to `My List`.
        initialSubscriptions: {
          update: isPublicAccount
            ? (mutableSubs, realm) =>
                mutableSubs.add(getMoviesQuery(realm), {name: 'movies'})
            : (mutableSubs, realm) => {
                mutableSubs.add(getMoviesQuery(realm), {name: 'movies'});
                mutableSubs.add(
                  realm
                    .objects(PrivateContent)
                    .filtered('userId == $0', userId),
                  {name: 'privateContent'},
                );
              },
        },
        // We can specify the behavior when opening a Realm for the first time
        // (`newRealmFileBehavior`) and for subsequent ones (`existingRealmFileBehavior`).
        // If the user has logged in at least 1 time before, the Realm and its data will
        // exist on disk and can be opened even when offline. We can either (a) open the
        // Realm immediately (or first create a new empty Realm file if it does not
        // exist before opening it) and sync the data to the device in the background
        // (`OpenRealmBehaviorType.OpenImmediately`), or (b) wait for any non-synced
        // data to be fully downloaded (`OpenRealmBehaviorType.DownloadBeforeOpen`).
        newRealmFileBehavior: {
          type: OpenRealmBehaviorType.OpenImmediately,
        },
        existingRealmFileBehavior: {
          type: OpenRealmBehaviorType.OpenImmediately,
        },
      }}
      // The `path` does not always need to be defined; however, for this example
      // app, we use a different Realm depending on whether the account is public.
      path={isPublicAccount ? 'public' : 'private'}>
      <MovieProvider>
        <RootNavigator />
      </MovieProvider>
    </RealmProvider>
  );
}
