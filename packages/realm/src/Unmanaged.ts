////////////////////////////////////////////////////////////////////////////
//
// Copyright 2022 Realm Inc.
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

import type { AnyRealmObject, Collection, Counter, Dictionary, List, Realm, RealmSet } from "./internal";

/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- We define these once to avoid using "any" through the code */
export type AnyCollection = Collection<any, any, any, any, any>;
/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- We define these once to avoid using "any" through the code */
export type AnyDictionary = Dictionary<any>;
/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- We define these once to avoid using "any" through the code */
export type AnyList = List<any>;
/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- We define these once to avoid using "any" through the code */
export type AnySet = RealmSet<any>;

type ExtractPropertyNamesOfType<T, PropType> = {
  [K in keyof T]: T[K] extends PropType ? K : never;
}[keyof T];

type ExtractPropertyNamesOfTypeExcludingNullability<T, PropType> = {
  [K in keyof T]: Exclude<T[K], null | undefined> extends PropType ? K : never;
}[keyof T];

/**
 * Exchanges properties defined as {@link List} with an optional {@link Array}.
 */
type RealmListRemappedModelPart<T> = {
  [K in ExtractPropertyNamesOfType<T, AnyList>]?: T[K] extends List<infer GT> ? Array<GT | Unmanaged<GT>> : never;
};

/**
 * Exchanges properties defined as {@link Dictionary} with an optional key to mixed value object.
 */
type RealmDictionaryRemappedModelPart<T> = {
  [K in ExtractPropertyNamesOfType<T, AnyDictionary>]?: T[K] extends Dictionary<infer ValueType>
    ? { [key: string]: ValueType }
    : never;
};

/**
 * Exchanges properties defined as {@link RealmSet} with an optional {@link Array}.
 */
type RealmSetRemappedModelPart<T> = {
  [K in ExtractPropertyNamesOfType<T, AnySet>]?: T[K] extends RealmSet<infer GT> ? Array<GT | Unmanaged<GT>> : never;
};

/**
 * Exchanges properties defined as a {@link Counter} with a `number`.
 */
type RealmCounterRemappedModelPart<T, RequiredProperties extends keyof RequirableProperties<T>> = OptionalExceptRequired<T, {
  [K in ExtractPropertyNamesOfTypeExcludingNullability<T, Counter>]: Counter | number | Exclude<T[K], Counter>;
}, RequiredProperties>;

type RealmObjectRemappedModelPart<T, RequiredProperties extends keyof RequirableProperties<T>> = OptionalExceptRequired<T, {
  [K in ExtractPropertyNamesOfTypeExcludingNullability<T, Realm.Object<any>>]: Unmanaged<T[K]> | undefined | null;
}, RequiredProperties>;

/** Omits all properties of a model which are not defined by the schema */
export type OmittedRealmTypes<T> = Omit<
  T,
  | keyof AnyRealmObject
  /* eslint-disable-next-line @typescript-eslint/ban-types */
  | ExtractPropertyNamesOfType<T, Function> // TODO: Figure out the use-case for this
  | ExtractPropertyNamesOfType<T, AnyCollection>
  | ExtractPropertyNamesOfType<T, AnyDictionary>
  | ExtractPropertyNamesOfTypeExcludingNullability<T, Counter>
  | ExtractPropertyNamesOfTypeExcludingNullability<T, Realm.Object<any>>
>;

export type RequirableProperties<T> = Omit<T, keyof AnyRealmObject>;

/** Make all fields optional except those specified in RequiredProperties */
type OptionalExceptRequired<T, TPart, RequiredProperties extends keyof RequirableProperties<T>> = Partial<TPart> & Pick<TPart, RequiredProperties & keyof TPart>;

/**
 * Omits all properties of a model which are not defined by the schema,
 * making all properties optional except those specified in RequiredProperties.
 */
type OmittedRealmTypesWithRequired<T, RequiredProperties extends keyof RequirableProperties<T>> = OptionalExceptRequired<
  T,
  OmittedRealmTypes<T>,
  RequiredProperties
>;

/** Remaps realm types to "simpler" types (arrays and objects) */
type RemappedRealmTypes<T, RequiredProperties extends keyof RequirableProperties<T>> =
  & RealmListRemappedModelPart<T>
  & RealmDictionaryRemappedModelPart<T>
  & RealmSetRemappedModelPart<T>
  & RealmCounterRemappedModelPart<T, RequiredProperties>
  & RealmObjectRemappedModelPart<T, RequiredProperties>;

/**
 * Joins `T` stripped of all keys which value extends {@link Collection} and all inherited from {@link Realm.Object},
 * with only the keys which value extends {@link List}, remapped as {@link Array}. All properties are optional
 * except those specified in `RequiredProperties`.
 */
export type Unmanaged<T, RequiredProperties extends keyof RequirableProperties<T> = never> = OmittedRealmTypesWithRequired<
  T,
  RequiredProperties
> &
  RemappedRealmTypes<T, RequiredProperties>;