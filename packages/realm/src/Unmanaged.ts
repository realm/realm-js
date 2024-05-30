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

import type { AnyRealmObject, Collection, Counter, Dictionary, List, Realm } from "./internal";

/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- We define these once to avoid using "any" through the code */
export type AnyCollection = Collection<any, any, any, any, any>;
/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- We define these once to avoid using "any" through the code */
export type AnyDictionary = Dictionary<any>;
/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- We define these once to avoid using "any" through the code */
export type AnyList = List<any>;

type ExtractPropertyNamesOfType<T, PropType> = {
  [K in keyof T]: T[K] extends PropType ? K : never;
}[keyof T];

type ExtractPropertyNamesOfUnerlyingType<T, PropType> = {
  [K in keyof T]: Exclude<T[K], null | undefined> extends PropType ? K : never;
}[keyof T]

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

// TODO(lj): Fix so that nullable Counters can be set to null (by TS) (see temporary type test at bottom).
/**
 * Exchanges properties defined as a {@link Counter} with a `number`.
 */
type RealmCounterRemappedModelPart<T> = {
  [K in ExtractPropertyNamesOfUnerlyingType<T, Counter>]?: Counter | number | Exclude<T[K], Counter>;
};

/** Omits all properties of a model which are not defined by the schema */
export type OmittedRealmTypes<T> = Omit<
  T,
  | keyof AnyRealmObject
  /* eslint-disable-next-line @typescript-eslint/ban-types */
  | ExtractPropertyNamesOfType<T, Function> // TODO: Figure out the use-case for this
  | ExtractPropertyNamesOfType<T, AnyCollection>
  | ExtractPropertyNamesOfType<T, AnyDictionary>
  | ExtractPropertyNamesOfUnerlyingType<T, Counter>
>;

/** Make all fields optional except those specified in K */
type OptionalExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;

/**
 * Omits all properties of a model which are not defined by the schema,
 * making all properties optional except those specified in RequiredProperties.
 */
type OmittedRealmTypesWithRequired<T, RequiredProperties extends keyof OmittedRealmTypes<T>> = OptionalExcept<
  OmittedRealmTypes<T>,
  RequiredProperties
>;

/** Remaps realm types to "simpler" types (arrays and objects) */
type RemappedRealmTypes<T> = RealmListRemappedModelPart<T> &
  RealmDictionaryRemappedModelPart<T> &
  RealmCounterRemappedModelPart<T>;

/**
 * Joins `T` stripped of all keys which value extends {@link Collection} and all inherited from {@link Realm.Object},
 * with only the keys which value extends {@link List}, remapped as {@link Array}. All properties are optional
 * except those specified in `RequiredProperties`.
 */
export type Unmanaged<T, RequiredProperties extends keyof OmittedRealmTypes<T> = never> = OmittedRealmTypesWithRequired<
  T,
  RequiredProperties
> &
  RemappedRealmTypes<T>;

// TODO(lj): Remove temporary manual type testing.

// type MyObj = {
//   counter1: Counter;
//   counter2: Counter;
//   nullableCounter1?: Counter | null;
//   nullableCounter2?: Counter | null;
//   counterOrUndefined1?: Counter;
//   counterOrUndefined2?: Counter;

//   stringProp1: string;
//   stringProp2: string;
//   nullableStringProp1: string | null;
//   nullableStringProp2: string | null;
//   stringOrUndefined1?: string;
//   stringOrUndefined2?: string;
// };

// const test: Unmanaged<MyObj> = {
//   counter1: 5, // Expected: valid
//   counter2: null, // Expected: invalid
//   nullableCounter1: null, // Expected: valid
//   nullableCounter2: 10, // Expected: valid
//   counterOrUndefined1: undefined, // Expected: valid
//   counterOrUndefined2: 10, // Expected: valid

//   stringProp1: "test", // Expected: valid
//   stringProp2: null, // Expected: invalid
//   nullableStringProp1: null, // Expected: valid
//   nullableStringProp2: "blah", // Expected: valid
//   stringOrUndefined1: undefined, // Expected: valid
//   stringOrUndefined2: "sad", // Expected: valid
// };
// test;
