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

import React, { useEffect, useState } from "react";
import Realm from "realm";

interface ProviderProps {
  children?: React.ReactNode;
  config?: Realm.Configuration;
}

export interface IRealmProvider {
  ({ children, config }: ProviderProps): JSX.Element | null;
}

export function createRealmProvider(
  realmConfig: Realm.Configuration,
  RealmContext: React.Context<Realm | null>,
): IRealmProvider {
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

  return RealmProvider;
}
