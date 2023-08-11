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

import Realm from "realm";

export interface IPerson {
  _id: Realm.BSON.ObjectId;
  name: string;
  age: number;
  friends: Realm.List<IPerson>;
  dogs: Realm.Collection<IDog>;
}

export const PersonSchema: Realm.ObjectSchema = {
  name: "Person",
  primaryKey: "_id",
  properties: {
    _id: "objectId",
    age: "int",
    name: "string",
    friends: "Person[]",
  },
};

export class Person extends Realm.Object<Person> {
  _id!: Realm.BSON.ObjectId;
  name!: string;
  age!: number;
  friends!: Realm.List<Person>;
  dogs!: Realm.Collection<Dog>;

  static schema: Realm.ObjectSchema = PersonSchema;
}

export interface IDog {
  _id: Realm.BSON.ObjectId;
  name: string;
  age: number;
  owner: IPerson;
}

export const DogSchema: Realm.ObjectSchema = {
  name: "Dog",
  primaryKey: "_id",
  properties: {
    _id: "objectId",
    age: "int",
    name: "string",
    owner: "Person",
  },
};

export class Dog extends Realm.Object<Dog> {
  _id!: Realm.BSON.ObjectId;
  name!: string;
  age!: number;
  owner!: Person;

  static schema: Realm.ObjectSchema = DogSchema;
}
