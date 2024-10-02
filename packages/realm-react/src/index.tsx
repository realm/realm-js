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
import React from "react";
import { createRealmContext } from "./RealmContext";

export type { UseObjectHook } from "./useObject";
export type { UseQueryHook, QueryHookOptions } from "./useQuery";

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
 * @example
 *  const syncConfig = {
 *     flexible: true,
 *     user: currentUser
 *   };
 *  const realm = new Realm(schema:[Task, User], path:"data.realm", sync: syncConfig);
 *  ...
 *  const AppRoot = () => {
 *   return (
 *     <RealmProvider>
 *       <App/>
 *     </RealmProvider>
 *   )
 * }
 * @param props - The {@link Realm.Configuration} or {@link Realm} for this Provider, passed as props.
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
 * The hook will update on any changes to any object in the collection.
 *
 * The result of this can be consumed directly by the `data` argument of any React Native
 * VirtualizedList or FlatList.  If the component used for the list's `renderItem` prop is {@link React.Memo}ized,
 * then only the modified object will re-render.
 * @example
 * ```tsx
 * // Return all collection items
 * const collection = useQuery({ type: Object });
 *
 * // Return all collection items sorted by name and filtered by category
 * const filteredAndSorted = useQuery({
 *   type: Object,
 *   query: (collection) => collection.filtered('category == $0',category).sorted('name'),
 * }, [category]);
 *
 * // Return all collection items sorted by name and filtered by category, triggering re-renders only if "name" changes
 * const filteredAndSorted = useQuery({
 *   type: Object,
 *   query: (collection) => collection.filtered('category == $0',category).sorted('name'),
 *   keyPaths: ["name"]
 * }, [category]);
 * ```
 * @param options
 * @param options.type - The object type, depicted by a string or a class extending Realm.Object
 * @param options.query - A function that takes a {@link Realm.Collection} and returns a {@link Realm.Collection} of the same type. This allows for filtering and sorting of the collection, before it is returned.
 * @param options.keyPaths - Indicates a lower bound on the changes relevant for the hook. This is a lower bound, since if multiple hooks add listeners (each with their own `keyPaths`) the union of these key-paths will determine the changes that are considered relevant for all listeners registered on the collection. In other words: A listener might fire and cause a re-render more than the key-paths specify, if other listeners with different key-paths are present.
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
 * @param keyPaths - Indicates a lower bound on the changes relevant for the hook. This is a lower bound, since if multiple hooks add listeners (each with their own `keyPaths`) the union of these key-paths will determine the changes that are considered relevant for all listeners registered on the object. In other words: A listener might fire and cause a re-render more than the key-paths specify, if other listeners with different key-paths are present.
 * @returns either the desired {@link Realm.Object} or `null` in the case of it being deleted or not existing.
 */
export const useObject = defaultContext.useObject;
/**
 * Returns the value representing the progress for a given {@link Realm.ProgressDirection}
 * and {@link Realm.ProgressMode}. The hook will register a progress notifier and update from
 * any changes from it.
 * @example
 * ```
 * const progress = useProgress({ direction: ProgressDirection.Download, mode: ProgressMode.ReportIndefinitely });
 * return <Text>Loading: {(100 * progress).toFixed()}%</Text>;
 * ```
 * @param options
 * @param options.direction - The {@link Realm.ProgressDirection} for the progress notifier.
 * @param options.mode - The {@link Realm.ProgressMode} for the progress notifier.
 * @returns a number between 0 and 1 representing the progress
 */
export const useProgress = defaultContext.useProgress;

/*
 * @ignore This will end up documenting all of Realm, which is documented elsewhere
 */
export { Realm };
export { createRealmContext } from "./RealmContext";
export * from "./AppProvider";
export { useUser, UserProvider } from "./UserProvider";
export * from "./useAuth";
export * from "./useEmailPasswordAuth";
export * from "./types";
export { createUseObject } from "./useObject";
export { createUseQuery } from "./useQuery";
