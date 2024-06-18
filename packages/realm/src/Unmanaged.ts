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

// TODO(lj): Uncomment
// import type { AnyRealmObject, Collection, Counter, Dictionary, List, Realm, RealmSet } from "./internal";

// -------
// TESTING
import type { AnyRealmObject, Collection, Counter, Dictionary, List, ObjectSchema, RealmSet } from "./internal";
import { Realm } from "./internal";
// -------

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
 * Exchanges properties defined as {@link Realm.Object} with a JS object.
 */
type RealmObjectRemappedModelPart<T, RequiredProperties extends keyof OmittedRealmObjectProperties<T>> = OptionalExcept<
  T,
  {
    [K in ExtractPropertyNamesOfTypeExcludingNullability<T, AnyRealmObject>]?: Exclude<
      T[K],
      null | undefined
    > extends Realm.Object<infer NestedT, infer NestedRequiredProperties>
      ? NestedT | Unmanaged<NestedT, NestedRequiredProperties> | null
      : never;
  },
  RequiredProperties
>;

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
type RealmCounterRemappedModelPart<
  T,
  RequiredProperties extends keyof OmittedRealmObjectProperties<T>,
> = OptionalExcept<
  T,
  {
    [K in ExtractPropertyNamesOfTypeExcludingNullability<T, Counter>]: Counter | number | Exclude<T[K], Counter>;
  },
  RequiredProperties
>;

/**
 * Omits all properties of a model which are not defined by the schema, as well
 * as properties containing a Realm collection, object, and counter.
 */
export type OmittedRealmTypes<T> = Omit<
  T,
  | keyof AnyRealmObject
  | ExtractPropertyNamesOfTypeExcludingNullability<T, AnyRealmObject>
  | ExtractPropertyNamesOfType<T, AnyCollection>
  | ExtractPropertyNamesOfType<T, AnyDictionary>
  | ExtractPropertyNamesOfTypeExcludingNullability<T, Counter>
  /* eslint-disable-next-line @typescript-eslint/ban-types */
  | ExtractPropertyNamesOfType<T, Function> // TODO: Figure out the use-case for this
>;

/**
 * Omits all properties of a model which are not defined by the schema.
 */
export type OmittedRealmObjectProperties<T> = Omit<T, keyof AnyRealmObject>;

/**
 * Makes all fields optional except those specified in RequiredProperties.
 */
type OptionalExcept<T, TPart, RequiredProperties extends keyof OmittedRealmObjectProperties<T>> = Partial<TPart> &
  Pick<TPart, RequiredProperties & keyof TPart>;

/**
 * Omits all properties of a model which are not defined by the schema,
 * making all properties optional except those specified in RequiredProperties.
 */
type OmittedRealmTypesWithRequired<
  T,
  RequiredProperties extends keyof OmittedRealmObjectProperties<T>,
> = OptionalExcept<T, OmittedRealmTypes<T>, RequiredProperties>;

/**
 * Remaps Realm types to "unmanaged" types.
 */
type RemappedRealmTypes<
  T,
  RequiredProperties extends keyof OmittedRealmObjectProperties<T>,
> = RealmObjectRemappedModelPart<T, RequiredProperties> &
  RealmListRemappedModelPart<T> &
  RealmDictionaryRemappedModelPart<T> &
  RealmSetRemappedModelPart<T> &
  RealmCounterRemappedModelPart<T, RequiredProperties>;

// TODO(lj): Update docs for this type.
/**
 * Joins `T` stripped of all keys which value extends {@link Collection} and all inherited from {@link Realm.Object},
 * with only the keys which value extends {@link List}, remapped as {@link Array}. All properties are optional
 * except those specified in `RequiredProperties`.
 */
export type Unmanaged<T, RequiredProperties extends keyof OmittedRealmObjectProperties<T> = never> = {
  [K in keyof T]?: K extends keyof OmittedRealmObjectProperties<T> ? unknown : never;
} & OmittedRealmTypesWithRequired<T, RequiredProperties> &
  RemappedRealmTypes<T, RequiredProperties>;

// -------------------
// MANUAL TYPE TESTING
// -------------------

class GrandChild extends Realm.Object<GrandChild, "leaf"> {
  leaf!: string;

  static schema: ObjectSchema = {
    name: "GrandChild",
    properties: {
      leaf: "string",
    },
  };
}

class Child extends Realm.Object<Child> {
  grandChild!: GrandChild;
  childListOfStrings!: Realm.List<string>;

  static schema: ObjectSchema = {
    name: "Child",
    properties: {
      grandChild: "GrandChild",
      childListOfStrings: "string[]",
    },
  };
}

class Parent1 extends Realm.Object<Parent1, "parentInt"> {
  child!: Child;
  parentListOfChildren!: Realm.List<Child>;
  parentInt!: number;

  static schema: ObjectSchema = {
    name: "Parent",
    properties: {
      child: "Child",
      parentListOfChildren: "Child[]",
      parentInt: "int",
    },
  };
}

class Parent2 extends Realm.Object<Parent2, "parentListOfChildren"> {
  child?: Child | null;
  parentListOfChildren!: Realm.List<Child | null>;
  parentInt?: number;

  static schema: ObjectSchema = {
    name: "Parent",
    properties: {
      child: "Child?",
      parentListOfChildren: "Child?[]",
      parentInt: "int?",
    },
  };
}

const realm = new Realm({ schema: [Parent1, Parent2, Child, GrandChild] });
realm.write(() => {
  // VALID
  // ('realm.create' takes RequiredProperties into account for all levels of nesting except at the top level.)
  const grandChild = realm.create(GrandChild, { leaf: "Hello" });
  const child = realm.create(Child, { grandChild });
  realm.create(Parent1, {});
  realm.create(Parent1, { child });
  realm.create(Parent1, { child: { grandChild } });
  realm.create(Parent1, { child: { grandChild: { leaf: "Hello" } } });
  realm.create(Parent1, { child: { childListOfStrings: ["Hello"] } });
  realm.create(Parent1, { parentListOfChildren: [child, { grandChild }, { grandChild: { leaf: "Hello" } }] });

  realm.create(Parent2, {});
  realm.create(Parent2, { child });
  realm.create(Parent2, { child: null });
  realm.create(Parent2, { child: undefined });
  realm.create(Parent2, { child: { grandChild } });
  realm.create(Parent2, { child: { grandChild: { leaf: "Hello" } } });
  realm.create(Parent2, { child: { childListOfStrings: ["Hello"] } });
  realm.create(Parent2, { parentListOfChildren: [child, { grandChild }, { grandChild: { leaf: "Hello" } }] });
  realm.create(Parent2, { parentListOfChildren: [child, { grandChild }, { grandChild: { leaf: "Hello" } }, null] });

  // VALID
  // (The constructor takes RequiredProperties into account for all levels of nesting.)
  new Parent1(realm, { parentInt: 0 });
  new Parent1(realm, { parentInt: 0, child });
  new Parent1(realm, { parentInt: 0, child: { grandChild: { leaf: "Hello" } } });

  // (Parent2 only uses RequiredProperties for a list which we never treat as required.
  // Should we though if the user wants to?)
  new Parent2(realm, {});
  new Parent2(realm, { child: null });
  new Parent2(realm, { child: { grandChild: { leaf: "Hello" } } });

  // INVALID
  realm.create(Parent1, 0);
  realm.create(Parent1, [0]);
  realm.create(Parent1, () => {});
  realm.create(Parent1, { child: 0 });
  realm.create(Parent1, { child: [0] });
  realm.create(Parent1, { child: () => {} });
  realm.create(Parent1, { child: grandChild });
  realm.create(Parent1, { child: { grandChild: 0 } });
  realm.create(Parent1, { child: { grandChild: [0] } });
  realm.create(Parent1, { child: { grandChild: () => {} } });
  realm.create(Parent1, { child: { grandChild: child } });
  realm.create(Parent1, { child: { grandChild: { leaf: 0 } } });
  realm.create(Parent1, { child: { invalidKey: { leaf: "Hello" } } });
  realm.create(Parent1, { child: { grandChild: { invalidKey: "Hello" } } });
  realm.create(Parent1, { child: { childListOfStrings: 0 } });
  realm.create(Parent1, { child: { childListOfStrings: [0] } });
  realm.create(Parent1, { parentListOfChildren: 0 });
  realm.create(Parent1, { parentListOfChildren: [0] });
  realm.create(Parent1, { parentListOfChildren: [{ invalidKey: { leaf: "Hello" } }] });
  realm.create(Parent1, { parentListOfChildren: [null] });
  realm.create(Parent1, { parentListOfChildren: [{ grandChild: {} }] });

  realm.create(Parent2, 0);
  realm.create(Parent2, [0]);
  realm.create(Parent2, () => {});
  realm.create(Parent2, { child: 0 });
  realm.create(Parent2, { child: [0] });
  realm.create(Parent2, { child: () => {} });
  realm.create(Parent2, { child: grandChild });
  realm.create(Parent2, { child: { grandChild: 0 } });
  realm.create(Parent2, { child: { grandChild: [0] } });
  realm.create(Parent2, { child: { grandChild: () => {} } });
  realm.create(Parent2, { child: { grandChild: child } });
  realm.create(Parent2, { child: { grandChild: { leaf: 0 } } });
  realm.create(Parent2, { child: { invalidKey: { leaf: "Hello" } } });
  realm.create(Parent2, { child: { grandChild: { invalidKey: "Hello" } } });
  realm.create(Parent2, { child: { childListOfStrings: 0 } });
  realm.create(Parent2, { child: { childListOfStrings: [0] } });
  realm.create(Parent2, { parentListOfChildren: 0 });
  realm.create(Parent2, { parentListOfChildren: [0] });
  realm.create(Parent2, { parentListOfChildren: [{ invalidKey: { leaf: "Hello" } }] });
  realm.create(Parent2, { parentListOfChildren: [{ grandChild: {} }] });

  // INVALID
  // (Needs the RequiredProperties at all levels.)
  new Parent1(realm, {});
  new Parent1(realm, { parentInt: 0, child: { grandChild: {} } });
  new Parent1(realm, { parentInt: 0, parentListOfChildren: [{ grandChild: {} }] });

  new Parent2(realm, { child: { grandChild: {} } });
  new Parent2(realm, { parentListOfChildren: [{ grandChild: {} }] });
});

type MyObj = {
  counter1: Counter;
  counter2: Counter;
  counter3: Counter;
  counter4: Counter;
  nullableCounter1?: Counter | null;
  nullableCounter2?: Counter | null;
  nullableCounter3?: Counter | null;
  counterOrUndefined1?: Counter;
  counterOrUndefined2?: Counter;
  counterOrUndefined3?: Counter;

  stringProp1: string;
  stringProp2: string;
  nullableStringProp1: string | null;
  nullableStringProp2: string | null;
  stringOrUndefined1?: string;
  stringOrUndefined2?: string;
};

declare const counter: Counter;
declare const nonCounterObject: List;
const counterTest: Unmanaged<MyObj, "counter1"> = {
  // VALID
  counter1: 5,
  counter2: counter,
  nullableCounter1: null,
  nullableCounter2: 10,
  nullableCounter3: counter,
  counterOrUndefined1: undefined,
  counterOrUndefined2: 10,
  counterOrUndefined3: counter,

  stringProp1: "test",
  nullableStringProp1: null,
  nullableStringProp2: "blah",
  stringOrUndefined1: undefined,
  stringOrUndefined2: "sad",

  // INVALID
  counter3: null,
  counter4: nonCounterObject,
  stringProp2: null,
};
counterTest;
