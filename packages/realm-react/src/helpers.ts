////////////////////////////////////////////////////////////////////////////
//
// Copyright 2023 Realm Inc.
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

// Convenience function that returns the correct type for the objectForPrimaryKey function
// Since we don't have a combined declaration for this function, typescript needs to know
// which return to use based on the typeof the type argument
export function getObjectForPrimaryKey<T extends Realm.Object>(
  realm: Realm,
  type: string | { new (...args: any): T },
  primaryKey: T[keyof T],
) {
  return typeof type === "string"
    ? realm.objectForPrimaryKey(type, primaryKey)
    : realm.objectForPrimaryKey(type, primaryKey);
}

// Convenience function that returns the correct type for the objects function
// Since we don't have a combined declaration for this function, typescript needs to know
// which return to use based on the typeof the type argument
export function getObjects<T extends Realm.Object>(
  realm: Realm,
  type: string | { new (...args: any): T },
): Realm.Results<T> {
  return (typeof type === "string" ? realm.objects(type) : realm.objects(type)) as Realm.Results<T>;
}

export type CollectionCallback = Parameters<typeof Realm.Results.prototype.addListener>[0];

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
export type AnyRealmObject = Realm.Object<any>;

export type RealmClassType<T = any> = { new (...args: any): T };

/**
 * Explicitly sets the unpicked properties of a type to never instead of dropping them like in Pick.
 * Useful for ensuring different prop types are mutually exclusive as React expects the union type
 * of different prop types to include all the fields.
 */
export type RestrictivePick<T, K extends keyof T> = Pick<T, K> & { [RestrictedKey in keyof Omit<T, K>]?: never };

export function isClassModelConstructor(value: unknown): value is RealmClassType<unknown> {
  return Object.getPrototypeOf(value) === Realm.Object;
}
