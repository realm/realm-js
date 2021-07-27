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

import React, { useContext, useEffect, useState } from "react";
import Realm from "realm";

interface ProviderProps {
  children?: React.ReactNode;
  config?: Realm.Configuration;
}

interface UseCollection {
  (type: string, modifiers?: { sort?: string; filter?: string }): Realm.Results<Realm.Object>;
}
interface UseObject {
  (type: string, primaryKey: Realm.PrimaryKey): Realm.Object | undefined;
}
interface RealmContext {
  RealmProvider: ({ children, config }: ProviderProps) => JSX.Element | null;
  useCollection: UseCollection;
  useObject: UseObject;
  useRealm: () => Realm;
}

export function createRealmContext(realmConfig: Realm.Configuration): RealmContext {
  const RealmContext = React.createContext<Realm | null>(null);
  const RealmProvider = ({ children, config }: ProviderProps) => {
    const [realm, setRealm] = useState<Realm | null>(null);
    useEffect(() => {
      if (!realm?.isClosed) {
        realm?.close();
      }
      const initRealm = async () => {
        try {
          const combinedConfig = {
            ...realmConfig,
            ...config,
          } as Realm.Configuration;
          const openRealm = await Realm.open(combinedConfig);
          setRealm(openRealm);
        } catch (err) {
          console.error(err);
        }
      };
      if (realm === null) {
        initRealm();
      }
      return () => {
        realm?.close();
      };
    }, [config]);

    if (realm == null) {
      return null;
    }

    return <RealmContext.Provider value={realm}>{children}</RealmContext.Provider>;
  };

  const useRealm = () => {
    const context = useContext(RealmContext);
    if (context == null) {
      throw new Error("RealmContext not found!");
    }
    return context;
  };

  const useCollection: UseCollection = (type, modifiers) => {
    const realm = useRealm();
    const sort = modifiers?.sort && modifiers?.sort !== "" ? modifiers.sort : null;
    const filter = modifiers?.filter != null && modifiers?.filter !== "" ? modifiers.filter : null;

    let result = null;
    result = realm.objects(type);
    if (filter) {
      result = result.filtered(filter);
    }

    if (sort) {
      result = result.sorted(sort);
    }

    return result;
  };

  const useObject: UseObject = (type, primaryKey) => {
    const realm = useRealm();
    return realm.objectForPrimaryKey(type, primaryKey);
  };

  return {
    RealmProvider,
    useRealm,
    useCollection,
    useObject,
  };
}
