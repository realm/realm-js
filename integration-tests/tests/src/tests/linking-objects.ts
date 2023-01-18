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

import { ObjectId } from "bson";
import { expect } from "chai";
import Realm from "realm";
import { openRealmBeforeEach } from "../hooks";

function names(results: Realm.Collection<IPersonSchema> | Realm.Results<IPersonSchema>) {
  return results.map(function (object: IPersonSchema) {
    return object.name;
  });
}

const PersonSchema: Realm.ObjectSchema = {
  name: "PersonObject",
  properties: {
    name: "string",
    age: "double",
    married: { type: "bool", default: false },
    children: { type: "list", objectType: "PersonObject" },
    parents: { type: "linkingObjects", objectType: "PersonObject", property: "children" },
  },
};

const NameSchema: Realm.ObjectSchema = {
  name: "NameObject",
  primaryKey: "_id",
  properties: {
    _id: "objectId",
    family: "string",
    given: "string[]",
    prefix: "string[]",
  },
};

const ParentSchema: Realm.ObjectSchema = {
  name: "ParentObject",
  primaryKey: "_id",
  properties: {
    _id: "objectId",
    id: "int",
    name: "NameObject[]",
  },
};

const LanguageSchema: Realm.ObjectSchema = {
  name: "Language",
  properties: {
    name: "string",
    spokenIn: { type: "linkingObjects", objectType: "Country", property: "languages" },
  },
};

const CountrySchema: Realm.ObjectSchema = {
  name: "Country",
  properties: {
    name: "string",
    languages: "Language[]",
  },
};

interface IPersonSchema {
  name: string;
  age: number;
  married: boolean;
  children: Realm.List<IPersonSchema>;
  parents: Realm.Collection<IPersonSchema>;
}

interface INameSchema {
  _id: ObjectId;
  family: string;
  given: string[];
  prefix: string[];
}

interface IParentSchema {
  _id: ObjectId;
  id: number;
  name: Name[];
}

interface ILanguageSchema {
  name: string;
  spokenIn: Realm.Collection<ICountrySchema>;
}

interface ICountrySchema {
  name: string;
  languages: ILanguageSchema[];
}

class Person extends Realm.Object implements IPersonSchema {
  name!: string;
  age!: number;
  married!: boolean;
  children!: Realm.List<IPersonSchema>;
  parents!: Realm.Collection<IPersonSchema>;
}

class Name extends Realm.Object implements INameSchema {
  _id!: ObjectId;
  family!: string;
  given!: string[];
  prefix!: string[];
}

describe("Linking objects", () => {
  describe("Same class", () => {
    openRealmBeforeEach({ schema: [PersonSchema] });
    it("add and delete propagate to linking object", function (this: RealmContext) {
      let olivier: IPersonSchema;
      let oliviersParents!: Realm.Collection<IPersonSchema>;
      this.realm.write(() => {
        olivier = this.realm.create<IPersonSchema>(PersonSchema.name, { name: "Olivier", age: 0 });
        this.realm.create(PersonSchema.name, { name: "Christine", age: 25, children: [olivier] });
        oliviersParents = olivier.parents;
        expect(names(oliviersParents)).eql(["Christine"]);
      });

      expect(names(oliviersParents)).eql(["Christine"]);

      this.realm.write(() => {
        this.realm.create(PersonSchema.name, { name: "JP", age: 28, children: [olivier] });

        expect(names(oliviersParents)).eql(["Christine", "JP"]);
      });

      this.realm.write(() => {
        this.realm.delete(olivier);

        expect(oliviersParents.length).equals(0);
      });
    });
    it("filters work on linking object", function (this: RealmContext) {
      let christine, olivier;
      this.realm.write(() => {
        olivier = this.realm.create<IPersonSchema>(PersonSchema.name, { name: "Olivier", age: 0 });
        christine = this.realm.create<IPersonSchema>(PersonSchema.name, {
          name: "Christine",
          age: 25,
          children: [olivier],
        });
        this.realm.create(PersonSchema.name, { name: "JP", age: 28, children: [olivier] });
      });

      const people = this.realm.objects<IPersonSchema>("PersonObject");
      expect(people.filtered("parents.age > 25").length).equals(1);
      expect(people.filtered("parents.age > 25")[0].name).equals("Olivier");
      expect(people.filtered("parents.@count == 2").length).equals(1);
      expect(people.filtered('parents.name CONTAINS[c] "chris"').length).equals(1);
      expect(people.filtered("parents.name.@size == 2").length).equals(1);
      expect(people.filtered("25 IN parents.age").length).equals(1);
    });
    it("throws on invalid input", function (this: RealmContext) {
      let person: Person;
      this.realm.write(() => {
        person = this.realm.create<IPersonSchema>(PersonSchema.name, { name: "Person 1", age: 50 });
      });
      expect(() => person.linkingObjects("NoSuchSchema", "noSuchProperty")).throws(
        Error,
        "Could not find schema for type 'NoSuchSchema'",
      );
      expect(() => person.linkingObjects("PersonObject", "noSuchProperty")).throws(
        Error,
        "Type 'PersonObject' does not contain property 'noSuchProperty'",
      );
      expect(() => person.linkingObjects("PersonObject", "name")).throws(
        Error,
        "'PersonObject.name' is not a relationship to 'PersonObject'",
      );
      let olivier: Person;
      let oliviersParents: Realm.Results<IPersonSchema>;
      this.realm.write(() => {
        olivier = this.realm.create<IPersonSchema>(PersonSchema.name, { name: "Olivier", age: 0 });
        this.realm.create(PersonSchema.name, { name: "Christine", age: 25, children: [olivier] });
        oliviersParents = olivier.linkingObjects<IPersonSchema>("PersonObject", "children");
        expect(names(oliviersParents)).eql(["Christine"]);
      });

      this.realm.write(() => {
        this.realm.create<IPersonSchema>(PersonSchema.name, { name: "JP", age: 28, children: [olivier] });

        expect(names(oliviersParents)).eql(["Christine", "JP"]);
      });

      this.realm.write(() => {
        this.realm.delete(olivier);
        expect(oliviersParents.length).equals(0);
      });
    });
    it("supports count operation", function (this: RealmContext) {
      let john!: Person;
      this.realm.write(() => {
        john = this.realm.create<IPersonSchema>(PersonSchema.name, { name: "John", age: 50 });
      });

      expect(john.linkingObjectsCount()).equals(0);

      let olivier!: Person;
      let key;
      this.realm.write(() => {
        olivier = this.realm.create<IPersonSchema>(PersonSchema.name, { name: "Olivier", age: 0 });
        key = olivier._objectKey();
        this.realm.create<IPersonSchema>(PersonSchema.name, { name: "Christine", age: 25, children: [olivier] });
      });

      expect(olivier.linkingObjectsCount()).equals(1);
      expect(olivier._objectKey()).equals(key);

      this.realm.write(() => {
        john.children.push(olivier);
      });

      expect(olivier._objectKey()).equals(key);
      expect(john.children.length).equals(1);
      expect(john.children[0]["name"]).equals("Olivier");
      expect(this.realm.objects("PersonObject").length).equals(3);
      expect(olivier.parents.length).equals(2);
      expect(olivier.linkingObjectsCount()).equals(2);
    });
  });
  describe("Non recursive", () => {
    openRealmBeforeEach({ schema: [ParentSchema, NameSchema] });
    it("count operation", function (this: RealmContext) {
      let parent: IParentSchema;
      this.realm.write(() => {
        parent = this.realm.create<IParentSchema>(ParentSchema.name, {
          _id: new ObjectId("0000002a9a7969d24bea4cf5"),
          id: 0,
        });
      });

      expect(this.realm.objects(ParentSchema.name).length).equals(1);

      let child!: Name;
      this.realm.write(() => {
        child = this.realm.create<INameSchema>(NameSchema.name, {
          _id: new ObjectId("0000002a9a7969d24bea4cf6"),
          family: "Johnson",
          given: ["Olivier"],
          prefix: [],
        });
        this.realm.create("ParentObject", { _id: new ObjectId("0000002a9a7969d24bea4cf7"), id: 1, name: [child] });
      });
      expect(this.realm.objects(ParentSchema.name).length).equals(2);
      expect(this.realm.objects(NameSchema.name).length).equals(1);
      expect(child.linkingObjectsCount()).equals(1);

      this.realm.write(() => {
        parent.name.push(child);
      });
      expect(this.realm.objects(ParentSchema.name).length).equals(2);
      expect(this.realm.objects(NameSchema.name).length).equals(1);
      expect(child.linkingObjectsCount()).equals(2);
    });
  });
  describe("across different classes", () => {
    openRealmBeforeEach({ schema: [LanguageSchema, CountrySchema] });
    it("count operation", function (this: RealmContext) {
      this.realm.write(() => {
        const english = this.realm.create(LanguageSchema.name, { name: "English" });
        const french = this.realm.create(LanguageSchema.name, { name: "French" });
        const danish = this.realm.create(LanguageSchema.name, { name: "Danish" });
        this.realm.create(LanguageSchema.name, { name: "Latin" });
        this.realm.create(CountrySchema.name, { name: "Canada", languages: [english, french] });
        this.realm.create(CountrySchema.name, { name: "Denmark", languages: [danish, english] });
        this.realm.create(CountrySchema.name, { name: "France", languages: [french, english] });
      });
      const languages = this.realm.objects<ILanguageSchema>("Language");
      {
        const spokenInThreeCountries = languages.filtered("spokenIn.@count == 3");
        expect(spokenInThreeCountries.length).equals(1);
        expect(spokenInThreeCountries[0].name).equals("English");
        const spokenInTwoCountries = languages.filtered("spokenIn.@count == 2");
        expect(spokenInTwoCountries.length).equals(1);
        expect(spokenInTwoCountries[0].name).equals("French");
        const spokenInOneCountry = languages.filtered("spokenIn.@count == 1");
        expect(spokenInOneCountry.length).equals(1);
        expect(spokenInOneCountry[0].name).equals("Danish");
        const languagesSpokenInCanada = languages.filtered('spokenIn.name ==[c] "canada"');
        expect(languagesSpokenInCanada.length).equals(2);
        expect(languagesSpokenInCanada[0].name).equals("English");
        expect(languagesSpokenInCanada[1].name).equals("French");
      }
      // check the same but using the unnamed relationship which is available to users
      {
        const spokenInThreeCountries = languages.filtered("@links.Country.languages.@count == 3");
        expect(spokenInThreeCountries.length).equals(1);
        expect(spokenInThreeCountries[0].name).equals("English");
        const spokenInTwoCountries = languages.filtered("@links.Country.languages.@count == 2");
        expect(spokenInTwoCountries.length).equals(1);
        expect(spokenInTwoCountries[0].name).equals("French");
        const spokenInOneCountry = languages.filtered("@links.Country.languages.@count == 1");
        expect(spokenInOneCountry.length).equals(1);
        expect(spokenInOneCountry[0].name).equals("Danish");
        const languagesSpokenInCanada = languages.filtered('@links.Country.languages.name ==[c] "canada"');
        expect(languagesSpokenInCanada.length).equals(2);
        expect(languagesSpokenInCanada[0].name).equals("English");
        expect(languagesSpokenInCanada[1].name).equals("French");
      }
      const notSpokenInAnyCountry = languages.filtered("@links.@count == 0"); // no incoming links over any relationships to the object
      expect(notSpokenInAnyCountry.length).equals(1);
      expect(notSpokenInAnyCountry[0].name).equals("Latin");
      const notSpokenMethod2 = languages.filtered("@links.Country.languages.@count == 0"); // links of a specific relationship are 0
      expect(notSpokenMethod2.length).equals(1);
      expect(notSpokenMethod2[0].name).equals("Latin");
    });
  });
});
