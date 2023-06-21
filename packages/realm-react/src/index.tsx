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
import { createUseRealm } from "./useRealm";
import { createUseQuery } from "./useQuery";
import { createUseObject } from "./useObject";
import { createRealmProvider } from "./RealmProvider";

type RealmContext = {
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
   * @param props - The {@link Realm.Configuration} for this Realm defaults to
   * the config passed to `createRealmProvider`, but individual config keys can
   * be overridden when creating a `<RealmProvider>` by passing them as props.
   * For example, to override the `path` config value, use a prop named `path`
   * e.g., `path="newPath.realm"`
   * an attribute of the same key.
   */
  RealmProvider: ReturnType<typeof createRealmProvider>;
  /**
   * Returns the instance of the {@link Realm} opened by the `RealmProvider`.
   * @example
   * ```
   * const realm = useRealm();
   * ```
   * @returns a realm instance
   */
  useRealm: ReturnType<typeof createUseRealm>;
  /**
   * Returns a {@link Realm.Collection} of {@link Realm.Object}s from a given type.
   * The hook will update on any changes to any object in the collection
   * and return an empty array if the collection is empty.
   *
   * The result of this can be consumed directly by the `data` argument of any React Native
   * VirtualizedList or FlatList.  If the component used for the list's `renderItem` prop is {@link React.Memo}ized,
   * then only the modified object will re-render.
   * @example
   * ```tsx
   * // Return all collection items
   * const collection = useQuery(Object)
   *
   * // Return all collection items sorted by name and filtered by category
   * const filteredAndSorted = useQuery(Object, (collection) => collection.filtered('category == $0',category).sorted('name'), [category]);
   * ```
   * @param type - The object type, depicted by a string or a class extending Realm.Object
   * @param query - A function that takes a {@link Realm.Collection} and returns a {@link Realm.Collection} of the same type.
   * This allows for filtering and sorting of the collection, before it is returned.
   * @param deps - An array of dependencies that will be passed to {@link React.useMemo}
   * @returns a collection of realm objects or an empty array
   */
  useQuery: ReturnType<typeof createUseQuery>;
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
   * @returns either the desired {@link Realm.Object} or `null` in the case of it being deleted or not existing.
   */
  useObject: ReturnType<typeof createUseObject>;
};

/**
 * Creates Realm React hooks and Provider component for a given Realm configuration
 * @example
 * ```
 *class Task extends Realm.Object {
 *  ...
 *
 *  static schema = {
 *    name: 'Task',
 *    primaryKey: '_id',
 *    properties: {
 *      ...
 *    },
 *  };
 *}
 *
 *const {useRealm, useQuery, useObject, RealmProvider} = createRealmContext({schema: [Task]});
 * ```
 * @param realmConfig - {@link Realm.Configuration} used to open the Realm
 * @returns An object containing a `RealmProvider` component, and `useRealm`, `useQuery` and `useObject` hooks
 */
export const createRealmContext: (realmConfig?: Realm.Configuration) => RealmContext = (
  realmConfig: Realm.Configuration = {},
) => {
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

/**
 * Returns a {@link Realm.Collection} of {@link Realm.Object}s from a given type.
 * The hook will update on any changes to any object in the collection
 * and return an empty array if the collection is empty.
 *
 * The result of this can be consumed directly by the `data` argument of any React Native
 * VirtualizedList or FlatList.  If the component used for the list's `renderItem` prop is {@link React.Memo}ized,
 * then only the modified object will re-render.
 * @example
 * ```tsx
 * // Return all collection items
 * const collection = useQuery(Object)
 *
 * // Return all collection items sorted by name and filtered by category
 * const filteredAndSorted = useQuery(Object, (collection) => collection.filtered('category == $0',category).sorted('name'), [category]);
 * ```
 * @param type - The object type, depicted by a string or a class extending Realm.Object
 * @param query - A function that takes a {@link Realm.Collection} and returns a {@link Realm.Collection} of the same type.
 * This allows for filtering and sorting of the collection, before it is returned.
 * @param deps - An array of dependencies that will be passed to {@link React.useMemo}
 * @returns a collection of realm objects or an empty array
 */
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
 * @returns either the desired {@link Realm.Object} or `null` in the case of it being deleted or not existing.
 */
export const useObject = defaultContext.useObject;

export { Realm };
export * from "./AppProvider";
export { useUser, UserProvider } from "./UserProvider";
export * from "./useAuth";
export * from "./useEmailPasswordAuth";
export * from "./types";
