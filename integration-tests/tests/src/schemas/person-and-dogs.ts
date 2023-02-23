////////////////////////////////////////////////////////////////////////////
//
// Copyright 2020 Realm Inc.
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

/* tslint:disable max-classes-per-file */

import { Realm } from "realm";

export interface IPerson {
  name: string;
  age: number;
  friends: Realm.List<IPerson>;
  dogs: Realm.Results<IDog>;
}

export const PersonSchema: Realm.ObjectSchema = {
  name: "Person",
  primaryKey: "name",
  properties: {
    age: "int",
    name: "string",
    friends: "Person[]",
  },
};

export class Person extends Realm.Object<Person> {
  name!: string;
  age!: number;
  friends!: Realm.List<Person>;
  dogs!: Realm.Collection<Dog>;

  constructor(realm: Realm, name: string, age: number) {
    super(realm, { name, age });
  }

  static schema: Realm.ObjectSchema = PersonSchema;
}

export interface IDog {
  name: string;
  age: number;
  owner: IPerson;
}

export const DogSchema: Realm.ObjectSchema = {
  name: "Dog",
  properties: {
    age: "int",
    name: "string",
    owner: "Person",
  },
};

export class Dog extends Realm.Object {
  name!: string;
  age!: number;
  owner!: Person;

  constructor(realm: Realm, name: string, age: number, owner: Person) {
    super(realm, { name, age, owner });
  }

  static schema: Realm.ObjectSchema = DogSchema;
}
