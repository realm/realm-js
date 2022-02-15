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

/**
 * Generates `RealmProvider` given a RealmConfiguration and React.Context.
 *
 * @param realmConfig - The configuration of the realm to be instantiated
 * @param RealmContext - The context that will contain the Realm instance
 * @returns a RealmProvider component that provides context to all context hooks
 */
export function createRealmProvider(
  realmConfig: Realm.Configuration,
  RealmContext: React.Context<Realm | null>,
): React.FC<ProviderProps> {
  /**
   * Returns a Context Provider component that is required to wrap any component using
   * the realm hooks.
   *
   * @example
   * ```
   * const AppRoot = () => {
   *   return (
   *     <RealmProvider path={"data.realm"} sync={syncConfigurationObject}>
   *       <App/>
   *     </RealmProvider>
   *   )
   * }
   * ```
   * @param props - One can override any attribute of a Realm.Configuration through the props using
   * an attribute of the same key.
   */
  return ({ children, ...restProps }) => {
    const [realm, setRealm] = useState<Realm | null>(null);
    // This forces the useEffect using configVersion as a dependency to reconfigure the realm.
    const [configVersion, setConfigVersion] = useState(0);

    const currentRealm = useRef(realm);
    // This will merge the configuration provided by createRealmContext and any configuration properties
    // set directly on the RealmProvider component.  Any settings on the component will override the original configuration.
    const configuration = useRef<Realm.Configuration>(mergeRealmConfiguration(realmConfig, restProps));

    // Reconfigure the configuration if any of the RealmProvider properties change.
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
      // This will ensure that realm is configured on the first render
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

// Create a configuration with configA as the default and overwritten by any
// attributes in configB
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

// Utility function that does a deep comparison (key: value) of object a with object b
export function areConfigurationsIdentical(a: Realm.Configuration, b: Realm.Configuration): boolean {
  return isEqual(a, b);
}
