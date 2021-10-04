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

//XXX Provider configuration properties as seperate properties
interface ProviderProps {
  config?: Realm.Configuration;
}

export type RealmProviderType = React.FC<ProviderProps>;

export function createRealmProvider(
  realmConfig: Realm.Configuration,
  RealmContext: React.Context<Realm | null>,
): RealmProviderType {
  const RealmProvider: React.FC<ProviderProps> = ({ children, config }) => {
    const [realm, setRealm] = useState<Realm | null>(null);
    //XXX consider confguration being changed with state (write tests for this)
    useEffect(() => {
      if (!realm?.isClosed) {
        realm?.close();
      }
      const initRealm = async () => {
        //XXX deep merge the configurations
        const combinedConfig = {
          ...realmConfig,
          ...config,
        } as Realm.Configuration;
        const openRealm = await Realm.open(combinedConfig);
        setRealm(openRealm);
      };
      if (realm === null) {
        initRealm().catch(console.error);
      }
      return () => {
        realm?.close(); //XXX test that this actually closes (maybe use multiple useEffects)
      };
    }, [config]); //use Ref for realm

    if (realm == null) {
      return null;
    }

    return <RealmContext.Provider value={realm} children={children} />;
  };

  return RealmProvider;
}
