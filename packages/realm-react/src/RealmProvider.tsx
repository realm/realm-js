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

import React, { useEffect, useState, useRef } from "react";
import Realm from "realm";
import { isEqual } from "lodash";

type ProviderProps = Realm.Configuration;

export function createRealmProvider(
  realmConfig: Realm.Configuration,
  RealmContext: React.Context<Realm | null>,
): React.FC<ProviderProps> {
  return ({ children, ...restProps }) => {
    const [realm, setRealm] = useState<Realm | null>(null);
    const [configVersion, setConfigVersion] = useState(0);

    const currentRealm = useRef(realm);
    const configuration = useRef<Realm.Configuration>(mergeRealmConfiguration(realmConfig, restProps));

    useEffect(() => {
      const combinedConfig = mergeRealmConfiguration(realmConfig, restProps);
      if (!areConfigurationsIdentical(configuration.current, combinedConfig)) {
        configuration.current = combinedConfig;
        setConfigVersion((x) => x + 1);
      }
    }, [restProps]);

    useEffect(() => {
      currentRealm.current = realm;
    }, [realm]);

    useEffect(() => {
      const realmRef = currentRealm.current;
      const shouldInitRealm = realmRef === null;
      const initRealm = async () => {
        const openRealm = await Realm.open(configuration.current);
        setRealm(openRealm);
      };
      if (shouldInitRealm) {
        initRealm().catch(console.error);
      }

      return () => {
        if (realm) {
          realm.close();
          setRealm(null);
        }
      };
    }, [configVersion, realm, setRealm]);

    if (!realm) {
      return null;
    }

    return <RealmContext.Provider value={realm} children={children} />;
  };
}

export function mergeRealmConfiguration(
  configA: Realm.Configuration,
  configB: Partial<Realm.Configuration>,
): Realm.Configuration {
  // In order to granularly update sync properties on the RealmProvider, sync must be
  // seperately applied to the configuration.  This allows for dynamic updates to the
  // partition field.
  const sync = { ...configA.sync, ...configB.sync };

  return {
    ...configA,
    ...configB,
    //TODO: When Realm >= 10.9.0 is a peer dependency, we can simply spread sync here
    //See issue #4012
    ...(Object.keys(sync).length > 0 ? { sync } : undefined),
  } as Realm.Configuration;
}

export function areConfigurationsIdentical(a: Realm.Configuration, b: Realm.Configuration): boolean {
  return isEqual(a, b);
}
