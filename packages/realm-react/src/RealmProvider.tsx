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
import { useUser } from "./UserProvider";

type PartialRealmConfiguration = {
  [P in keyof Omit<Realm.Configuration, "sync">]?: Realm.Configuration[P];
} & {
  sync?: Partial<Realm.SyncConfiguration>;
};

type ProviderProps = PartialRealmConfiguration & {
  fallback?: React.ComponentType<unknown> | React.ReactElement | null | undefined;
};

/**
 * Generates a `RealmProvider` given a {@link Realm.Configuration} and {@link React.Context}.
 *
 * @param realmConfig - The configuration of the Realm to be instantiated
 * @param RealmContext - The context that will contain the Realm instance
 * @returns a RealmProvider component that provides context to all context hooks
 */
export function createRealmProvider(
  realmConfig: Realm.Configuration,
  RealmContext: React.Context<Realm | null>,
): React.FC<ProviderProps> {
  /**
   * Returns a Context Provider component that is required to wrap any component using
   * the Realm hooks.
   *
   * @example
   * ```
   * const AppRoot = () => {
   *   const syncConfig = {
   *     flexible: true,
   *     user: currentUser
   *   };
   *
   *   return (
   *     <RealmProvider path="data.realm" sync={syncConfig}>
   *       <App/>
   *     </RealmProvider>
   *   )
   * }
   * ```
   * @param props - The {@link Realm.Configuration} for this Realm defaults to
   * the config passed to `createRealmProvider`, but individual config keys can
   * be overridden when creating a `<RealmProvider>` by passing them as props.
   * For example, to override the `path` config value, use a prop named `path`,
   * e.g. `path="newPath.realm"`
   */
  return ({ children, fallback: Fallback, ...restProps }) => {
    const [realm, setRealm] = useState<Realm | null>(null);

    // Automatically set the user in the configuration if its been set.
    const user = useUser();

    // We increment `configVersion` when a config override passed as a prop
    // changes, which triggers a `useEffect` to re-open the Realm with the
    // new config
    const [configVersion, setConfigVersion] = useState(0);

    // We put realm in a ref to avoid have an endless loop of updates when the realm is updated
    const currentRealm = useRef(realm);

    // This will merge the configuration provided by createRealmContext and any configuration properties
    // set directly on the RealmProvider component.  Any settings on the component will override the original configuration.
    const configuration = useRef<Realm.Configuration>(mergeRealmConfiguration(realmConfig, restProps));

    // Merge and set the configuration again and increment the version if any
    // of the RealmProvider properties change.
    useEffect(() => {
      const combinedConfig = mergeRealmConfiguration(realmConfig, restProps);

      // If there is a user in the current context and not one set by the props, then use the one from context
      const combinedConfigWithUser =
        user && !combinedConfig.sync?.user
          ? mergeRealmConfiguration(combinedConfig, { sync: { user } })
          : combinedConfig;

      if (!areConfigurationsIdentical(configuration.current, combinedConfigWithUser)) {
        configuration.current = combinedConfigWithUser;
        // Only rerender if realm has already been configured
        if (currentRealm.current != null) {
          setConfigVersion((x) => x + 1);
        }
      }
    }, [restProps, user]);

    useEffect(() => {
      currentRealm.current = realm;
    }, [realm]);

    useEffect(() => {
      const realmRef = currentRealm.current;
      // Check if we currently have an open Realm. If we do not (i.e. it is the first
      // render, or the Realm has been closed due to a config change), then we
      // need to open a new Realm.
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
      if (typeof Fallback === "function") {
        return <Fallback />;
      }
      return <>{Fallback}</>;
    }

    return <RealmContext.Provider value={realm} children={children} />;
  };
}

/**
 * Merge two configurations, creating a configuration using `configA` as the default,
 * merged with `configB`, with properties in `configB` overriding `configA`.
 *
 * @param configA - The default config object
 * @param configB - Config overrides object
 * @returns Merged config object
 */
export function mergeRealmConfiguration(
  configA: Realm.Configuration,
  configB: PartialRealmConfiguration,
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

/**
 * Utility function that does a deep comparison (key: value) of object a with object b
 *
 * @param a - Object to compare
 * @param b - Object to compare
 * @returns True if the objects are identical
 */
export function areConfigurationsIdentical(a: Realm.Configuration, b: Realm.Configuration): boolean {
  return isEqual(a, b);
}
