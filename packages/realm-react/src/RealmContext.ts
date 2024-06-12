////////////////////////////////////////////////////////////////////////////
//
// Copyright 2024 Realm Inc.
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

import { createContext } from "react";
import Realm from "realm";

import { RealmProvider, createRealmProvider } from "./RealmProvider";
import { UseObjectHook, createUseObject } from "./useObject";
import { UseQueryHook, createUseQuery } from "./useQuery";
import { UseRealmHook, createUseRealm } from "./useRealm";

export type RealmContext = {
  RealmProvider: RealmProvider;
  useRealm: UseRealmHook;
  useQuery: UseQueryHook;
  useObject: UseObjectHook;
};

/**
 * Creates Realm React hooks and Provider component for a given Realm configuration
 * @example
 * ```
 *class Task extends Realm.Object {
 *  ...
 *
 *  static schema = {
 *    name: 'Task',
 *    primaryKey: '_id',
 *    properties: {
 *      ...
 *    },
 *  };
 *}
 *
 *const {useRealm, useQuery, useObject, RealmProvider} = createRealmContext({schema: [Task]});
 * ```
 * @param realmConfig - {@link Realm.Configuration} used to open the Realm
 * @returns An object containing a `RealmProvider` component, and `useRealm`, `useQuery` and `useObject` hooks
 */
export const createRealmContext: (realmConfig?: Realm.Configuration) => RealmContext = (
  realmConfig: Realm.Configuration = {},
) => {
  const RealmContext = createContext<Realm | null>(null);
  const RealmProvider = createRealmProvider(realmConfig, RealmContext);

  const useRealm = createUseRealm(RealmContext);
  const useQuery = createUseQuery(useRealm);
  const useObject = createUseObject(useRealm);

  return {
    RealmProvider,
    useRealm,
    useQuery,
    useObject,
  };
};
