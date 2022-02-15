////////////////////////////////////////////////////////////////////////////
//
// Copyright 2021 Realm Inc.
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
import { createUseRealm } from "./useRealm";
import { createUseQuery } from "./useQuery";
import { createUseObject } from "./useObject";
import { createRealmProvider } from "./RealmProvider";

type RealmContext = {
  RealmProvider: ReturnType<typeof createRealmProvider>;
  useQuery: ReturnType<typeof createUseQuery>;
  useObject: ReturnType<typeof createUseObject>;
  useRealm: ReturnType<typeof createUseRealm>;
};
interface CreateRealmContext {
  (realmConfig: Realm.Configuration): RealmContext;
}

/**
 * Creates realm hooks and Provider component for a given Realm configuration
 *
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
 *const {userRealm, useQuery, useObject, RealmProvider} = createRealmContext({schema: [Task]});
 * ```
 *
 * @param realmConfig - Configuration used to open a Realm
 * @returns RealmProvider, useRealm, useQuery, useObject
 */
export const createRealmContext: CreateRealmContext = (realmConfig: Realm.Configuration) => {
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

export { Realm };
