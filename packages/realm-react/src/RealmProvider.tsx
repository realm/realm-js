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

import React, { useContext, useEffect, useRef, useState } from "react";
import Realm from "realm";
import isEqual from "lodash.isequal";

import { UserContext } from "./UserProvider";
import { RestrictivePick } from "./helpers";

type PartialRealmConfiguration = Omit<Partial<Realm.Configuration>, "sync"> & {
  sync?: Partial<Realm.SyncConfiguration>;
};

export type RealmProviderFallback = React.ComponentType<{
  progress: number | null;
}>;

/** Props used for a configuration-based Realm provider */
type RealmProviderConfigurationProps = {
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
  fallback?: RealmProviderFallback | React.ComponentType | React.ReactElement | null | undefined;
  children: React.ReactNode;
} & PartialRealmConfiguration;

/** Props used for a Realm instance-based Realm provider */
type RealmProviderRealmProps = {
  /**
   * The Realm instance to be used by the provider.
   */
  realm: Realm;
  children: React.ReactNode;
};

type RealmProviderProps = RealmProviderConfigurationProps & RealmProviderRealmProps;

/**
 * Represents the provider returned from `createRealmContext` with a Realm instance  i.e. `createRealmContext(new Realm(...))`.
 * Omits "realm" as it gets set at creation and cannot be changed.
 
 * **Note:** the hooks returned from `createRealmContext` using an existing Realm can be used outside of the scope of the provider.
 */
export type RealmProviderFromRealm = React.FC<Omit<RealmProviderRealmProps, "realm">>;

/**
 * Represents the provider returned from `createRealmContext` with a configuration, i.e. `createRealmContext({schema: [...]})`.
 */
export type RealmProviderFromConfiguration = React.FC<RealmProviderConfigurationProps>;

/**
 * Represents properties of a {@link DynamicRealmProvider} where Realm instance props are set and Configuration props are disallowed.
 */
export type DynamicRealmProviderWithRealmProps = RestrictivePick<RealmProviderProps, keyof RealmProviderRealmProps>;

/**
 * Represents properties of a {@link DynamicRealmProvider} where Realm configuration props are set and Realm instance props are disallowed.
 */
export type DynamicRealmProviderWithConfigurationProps = RestrictivePick<
  RealmProviderProps,
  keyof RealmProviderConfigurationProps
>;

/**
 * Represents the provider returned from creating context with no arguments (including the default context).
 * Supports either {@link RealmProviderRealmProps} or {@link RealmProviderConfigurationProps}.
 */
export type DynamicRealmProvider = React.FC<
  DynamicRealmProviderWithRealmProps | DynamicRealmProviderWithConfigurationProps
>;

export function createRealmProviderFromRealm(
  realm: Realm,
  RealmContext: React.Context<Realm | null>,
): RealmProviderFromRealm {
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
): RealmProviderFromConfiguration {
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

    const [progress, setProgress] = useState<number | null>(null);

    useEffect(() => {
      const realmRef = currentRealm.current;
      // Check if we currently have an open Realm. If we do not (i.e. it is the first
      // render, or the Realm has been closed due to a config change), then we
      // need to open a new Realm.
      const shouldInitRealm = realmRef === null;
      const initRealm = async () => {
        const openRealmPromise = Realm.open(configuration.current);
        if (configuration.current.sync?.flexible) {
          try {
            openRealmPromise.progress((estimate: number) => {
              setProgress(estimate);
            });
          } catch (error) {
            console.warn("Progress information with @realm/react work with realm version >=12.12.0.");
          }
        }
        const openRealm = await openRealmPromise;
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
        return <Fallback progress={progress} />;
      }
      return <>{Fallback}</>;
    }

    return <RealmContext.Provider value={realm} children={children} />;
  };
}

/**
 * Generates a `RealmProvider` which is either based on a configuration
 * or based on a realm, depending on its props.
 * @param RealmContext - The context that will contain the Realm instance
 * @returns a RealmProvider component that provides context to all context hooks
 */
export function createDynamicRealmProvider(RealmContext: React.Context<Realm | null>): DynamicRealmProvider {
  return ({ realm, children, ...configurationProps }) => {
    if (realm) {
      if (Object.keys(configurationProps).length > 0) {
        throw new Error("Cannot use configuration props when using an existing Realm instance.");
      }

      const RealmProvider = createRealmProviderFromRealm(realm, RealmContext);
      return <RealmProvider>{children}</RealmProvider>;
    } else {
      const RealmProvider = createRealmProviderFromConfig({}, RealmContext);
      return <RealmProvider {...configurationProps}>{children}</RealmProvider>;
    }
  };
}

/**
 * Generates the appropriate `RealmProvider` based on whether there is a config, realm, or neither given.
 * @param realmOrConfig - A Realm instance, a configuration, or undefined (including default provider).
 * @param RealmContext - The context that will contain the Realm instance
 * @returns a RealmProvider component that provides context to all context hooks
 */
export function createRealmProvider(
  realmOrConfig: Realm.Configuration | Realm | undefined,
  RealmContext: React.Context<Realm | null>,
): RealmProviderFromConfiguration | RealmProviderFromRealm | DynamicRealmProvider {
  if (!realmOrConfig) {
    return createDynamicRealmProvider(RealmContext);
  } else if (realmOrConfig instanceof Realm) {
    return createRealmProviderFromRealm(realmOrConfig, RealmContext);
  } else {
    return createRealmProviderFromConfig(realmOrConfig, RealmContext);
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
