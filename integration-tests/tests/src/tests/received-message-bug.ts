////////////////////////////////////////////////////////////////////////////
//
// Copyright 2024 Realm Inc.
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
import { authenticateUserBefore, importAppBefore, openRealmBeforeEach } from "../hooks";
import { buildAppConfig } from "../utils/build-app-config";
import { expect } from "chai";

export const PersonSchema: Realm.ObjectSchema = {
  name: "Person",
  primaryKey: "_id",
  properties: {
    _id: "objectId",
    age: "int",
    name: "string",
    friends: "Person[]",
    nonQueryable: "string?",
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

describe.only("opening a flexible Realm", () => {
  importAppBefore(buildAppConfig("with-flx").anonAuth().flexibleSync());
  authenticateUserBefore();
  afterEach(() => {
    Realm.clearTestState();
  });
  openRealmBeforeEach({
    schema: [Person, Dog],
    sync: {
      flexible: true,
      //@ts-expect-error Using an internal API
      _sessionStopPolicy: Realm.SessionStopPolicy.Immediately,
    },
  });

  for (let i = 0; i < 1000; i++) {
    it(`opens #${i}`, function (this: RealmContext) {
      expect(this.realm.path).is.string;
    });
  }
});
