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

import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import Realm from "realm";
import { isEqual } from "lodash";

import { UserContext } from "./UserProvider";

type PartialRealmConfiguration = Omit<Partial<Realm.Configuration>, "sync"> & {
  sync?: Partial<Realm.SyncConfiguration>;
};

export type RealmProviderProps = {
  /**
   * The Realm instance to be used by the provider.
   */
  realm?: Realm;
  /**
   * If false, Realm will not be closed when the component unmounts.
   * @default true
   */
  closeOnUnmount?: boolean;
  /**
   * A ref to the Realm instance. This is useful if you need to access the Realm
   * instance outside of a component that uses the Realm hooks.
   */
  realmRef?: React.MutableRefObject<Realm | null>;
  /**
   * The fallback component to render if the Realm is not open.
   */
  fallback?: React.ComponentType<unknown> | React.ReactElement | null | undefined;
  children: React.ReactNode;
} & PartialRealmConfiguration;

/**
  Represents the provider returned from using an existing realm at context creation i.e. `createRealmContext(new Realm))`.
 */
export type RealmProviderFromRealmInstanceFC = React.FC<{
  children: React.ReactNode;
}>;

/**
 * Represents the provider returned from using a Realm configuration at context creation i.e. `createRealmContext({schema: []}))`.
 */
export type RealmProviderFromConfigFC = React.FC<
  Pick<RealmProviderProps, "closeOnUnmount" | "realmRef" | "fallback" | "children"> & PartialRealmConfiguration
>;

/**
 * Explicitly sets the unpicked properties of a type to never instead of dropping them like in Pick.
 * Useful for ensuring different prop types are mutually exclusive as React expects the union type
 * of different prop types to be compatible by including all the fields.
 */
type RestrictivePick<T, K extends keyof T> = Pick<T, K> & { [RestrictedKey in keyof Omit<T, K>]?: never };

/**
 * Represents properties of a generic RealmProvider where the realm is set and therefore all other
 * props should be disallowed.
 */
export type RealmProviderWithRealmInstanceProps = RestrictivePick<RealmProviderProps, "realm" | "children">;

/*
 * Represents properties of a generic RealmProvider where Realm configuration props are used and no realm is set
 */
export type RealmProviderWithConfigurationProps = RestrictivePick<
  RealmProviderProps,
  "closeOnUnmount" | "realmRef" | "fallback" | "children" | keyof PartialRealmConfiguration
>;

/**
 * Represents the provider returned from creating context with no arguments (including the default context).
 * Supports either passing a `realm` as a property or the schema configuration.
 */
export type FlexibleRealmProviderFC = React.FC<
  RealmProviderWithRealmInstanceProps | RealmProviderWithConfigurationProps
>;

export function createRealmProviderFromRealm(
  realm: Realm | null,
  RealmContext: React.Context<Realm | null>,
): RealmProviderFromRealmInstanceFC {
  return ({ children }) => {
    return <RealmContext.Provider value={realm} children={children} />;
  };
}

/**
 * Generates a `RealmProvider` given a {@link Realm.Configuration} and {@link React.Context}.
 * @param realmConfig - The configuration of the Realm to be instantiated
 * @param RealmContext - The context that will contain the Realm instance
 * @returns a RealmProvider component that provides context to all context hooks
 */
export function createRealmProviderFromConfig(
  realmConfig: Realm.Configuration,
  RealmContext: React.Context<Realm | null>,
): RealmProviderFromConfigFC {
  return ({ children, fallback: Fallback, closeOnUnmount = true, realmRef, ...restProps }) => {
    const [realm, setRealm] = useState<Realm | null>(() =>
      realmConfig.sync === undefined && restProps.sync === undefined
        ? new Realm(mergeRealmConfiguration(realmConfig, restProps))
        : null,
    );

    // Automatically set the user in the configuration if its been set.
    // Grabbing directly from the context to avoid throwing an error if the user is not set.
    const user = useContext(UserContext);

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
        combinedConfig?.sync && user ? mergeRealmConfiguration({ sync: { user } }, combinedConfig) : combinedConfig;

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
      if (realmRef) {
        realmRef.current = realm;
      }
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
          if (closeOnUnmount) {
            realm.close();
          }
          setRealm(null);
        }
      };
    }, [configVersion, realm, setRealm, closeOnUnmount]);

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
 * Generates a flexible `RealmProvider` which is either based on configuration or based on a realm
 * depending on its props.
 * @param RealmContext - The context that will contain the Realm instance
 * @returns a RealmProvider component that provides context to all context hooks
 */
export function createFlexibleRealmProvider(RealmContext: React.Context<Realm | null>): FlexibleRealmProviderFC {
  return ({ realm, ...restProps }) => {
    return useMemo(() => {
      if (realm != null) {
        const RealmProviderFromRealm = createRealmProviderFromRealm(realm, RealmContext);
        return <RealmProviderFromRealm {...restProps} />;
      } else {
        const RealmProviderFromConfig = createRealmProviderFromConfig({}, RealmContext);
        return <RealmProviderFromConfig {...restProps} />;
      }
    }, [realm]);
  };
}

/**
 * Generates the appropriate `RealmProvider` based on whether there is a config, realm, or neither given.
 * @param realmOrRealmConfig - An existing Realm, a configuration, or undefined (including default provider).
 * @param RealmContext - The context that will contain the Realm instance
 * @returns a RealmProvider component that provides context to all context hooks
 */
export function createRealmProvider(
  realmOrRealmConfig: Realm.Configuration | Realm | undefined,
  RealmContext: React.Context<Realm | null>,
): RealmProviderFromConfigFC | RealmProviderFromRealmInstanceFC | FlexibleRealmProviderFC {
  if (realmOrRealmConfig == undefined) {
    return createFlexibleRealmProvider(RealmContext);
  } else if (realmOrRealmConfig instanceof Realm) {
    return createRealmProviderFromRealm(realmOrRealmConfig, RealmContext);
  } else {
    return createRealmProviderFromConfig(realmOrRealmConfig, RealmContext);
  }
}

/**
 * Merge two configurations, creating a configuration using `configA` as the default,
 * merged with `configB`, with properties in `configB` overriding `configA`.
 * @param configA - The default config object
 * @param configB - Config overrides object
 * @returns Merged config object
 */
export function mergeRealmConfiguration(
  configA: PartialRealmConfiguration,
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
 * @param a - Object to compare
 * @param b - Object to compare
 * @returns True if the objects are identical
 */
export function areConfigurationsIdentical(a: Realm.Configuration, b: Realm.Configuration): boolean {
  return isEqual(a, b);
}
