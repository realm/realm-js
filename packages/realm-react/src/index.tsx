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

import Realm from "realm";

export type { RealmProviderProps, PartialRealmConfiguration } from "./RealmProvider";
export type { UserProviderProps } from "./UserProvider";
export type { UseObjectHook } from "./useObject";
export type {
  UseQueryHook,
  QueryHookOptions,
  QueryHookClassBasedOptions,
  QueryCallback,
  DependencyList,
} from "./useQuery";

import { UseQueryHook } from "./useQuery";

import { createRealmContext } from "./RealmContext";

const defaultContext = createRealmContext();

/**
 * The Provider component that is required to wrap any component using
 * the Realm hooks.
 * @example
 * ```
 * const AppRoot = () => {
 *   const syncConfig = {
 *     flexible: true,
 *     user: currentUser
 *   };
 *
 *   return (
 *     <RealmProvider schema={[Task, User]} path={"data.realm"} sync={syncConfig}>
 *       <App/>
 *     </RealmProvider>
 *   )
 * }
 * ```
 * @param props - The {@link Realm.Configuration} for this Realm, passed as props.
 * By default, this is the main configuration for the Realm.
 */
export const RealmProvider = defaultContext.RealmProvider;

/**
 * Returns the instance of the {@link Realm} opened by the `RealmProvider`.
 * @example
 * ```
 * const realm = useRealm();
 * ```
 * @returns a realm instance
 */
export const useRealm = defaultContext.useRealm;

export const useQuery = defaultContext.useQuery;

/**
 * Returns a {@link Realm.Object} from a given type and value of primary key.
 * The hook will update on any changes to the properties on the returned object
 * and return null if it either doesn't exists or has been deleted.
 * @example
 * ```
 * const object = useObject(ObjectClass, objectId);
 * ```
 * @param type - The object type, depicted by a string or a class extending {@link Realm.Object}
 * @param primaryKey - The primary key of the desired object which will be retrieved using {@link Realm.objectForPrimaryKey}
 * @param keyPaths - Indicates a lower bound on the changes relevant for the hook. This is a lower bound, since if multiple hooks add listeners (each with their own `keyPaths`) the union of these key-paths will determine the changes that are considered relevant for all listeners registered on the object. In other words: A listener might fire and cause a re-render more than the key-paths specify, if other listeners with different key-paths are present.
 * @returns either the desired {@link Realm.Object} or `null` in the case of it being deleted or not existing.
 */
export const useObject = defaultContext.useObject;

/*
 * @ignore This will end up documenting all of Realm, which is documented elsewhere
 */
export { Realm };
export * from "./AppProvider";
export { useUser, UserProvider } from "./UserProvider";
export * from "./useAuth";
export * from "./useEmailPasswordAuth";
export * from "./types";
