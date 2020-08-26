////////////////////////////////////////////////////////////////////////////
//
// Copyright 2019 Realm Inc.
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

import * as Realm from "realm";

export interface IPerson {
    name: string;
    age: number;
    friends: Realm.List<IPerson>;
    dogs: Realm.Collection<IDog>;
}

export const PersonSchema: Realm.ObjectSchema = {
    name: "Person",
    properties: {
        age: "int",
        name: "string",
        friends: "Person[]"
    }
};

export class Person extends Realm.Object {
    name: string;
    age: number;
    friends: Realm.List<Person>;
    dogs: Realm.Collection<Dog>;

    constructor(name: string, age: number) {
      super();

      this.name = name;
      this.age = age;
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
        owner: "Person"
    }
};

export class Dog extends Realm.Object {
    name: string;
    age: number;
    owner: Person;

    constructor(name: string, age: number, owner: Person) {
      super();

      this.name = name;
      this.age = age;
      this.owner = owner;
    }

    static schema: Realm.ObjectSchema = DogSchema;
}
