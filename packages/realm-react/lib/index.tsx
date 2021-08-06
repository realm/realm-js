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
import { createUseRealm, UseRealm } from "./useRealm";
import { UseQuery, createUseQuery } from "./useQuery";
import { UseObject, createUseObject } from "./useObject";
import { createRealmProvider, IRealmProvider } from "./RealmProvider";

interface RealmContext {
  RealmProvider: IRealmProvider;
  useQuery: UseQuery;
  useObject: UseObject;
  useRealm: UseRealm;
}

interface CreateRealmContext {
  (realmConfig: Realm.Configuration): RealmContext;
}

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
