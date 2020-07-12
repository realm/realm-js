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
    _id: string;
    name: string;
    age: number;
    friends: Realm.List<IPerson>;
    dogs: Realm.Collection<IDog>;
}

export const PersonSchema: Realm.ObjectSchema = {
    name: "Person",
    primaryKey: "_id",
    properties: {
        _id: "string",
        age: "int",
        name: "string",
        friends: "Person[]"
    }
};

export class Person extends Realm.Object {
    public static schema: Realm.ObjectSchema = PersonSchema;
    public _id: string;
    public name: string;
    public age: number;
    public friends: Realm.List<Person>;
    public dogs: Realm.Collection<Dog>;
}

export interface IDog {
    _id: string;
    name: string;
    age: number;
    owner: IPerson;
}

export const DogSchema: Realm.ObjectSchema = {
    name: "Dog",
    primaryKey: "_id",
    properties: {
        _id: "string",
        age: "int",
        name: "string",
        owner: "Person"
    }
};

export class Dog extends Realm.Object {
    public static schema: Realm.ObjectSchema = DogSchema;
    public _id: string;
    public name: string;
    public age: number;
    public owner: Person;
}
