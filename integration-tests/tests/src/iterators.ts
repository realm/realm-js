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

import { expect } from "chai";

import {
    Dog,
    DogSchema,
    IDog,
    IPerson,
    Person,
    PersonSchema
} from "./schemas/person-and-dogs";

describe("Iterating", () => {
    let realm: Realm;
    let dogs: { [name: string]: Dog };
    let persons: { [name: string]: Person };

    beforeEach(() => {
        // Add linkingObjects to the PersonAndDogs schema
        const PersonWithDogsSchema = {
            ...PersonSchema,
            properties: {
                ...PersonSchema.properties,
                dogs: {
                    type: "linkingObjects",
                    objectType: "Dog",
                    property: "owner"
                }
            }
        };
        realm = new Realm({ schema: [DogSchema, PersonWithDogsSchema] });
        realm.write(() => {
            persons = {
                alice: realm.create<IPerson>("Person", {
                    name: "Alice",
                    age: 16
                }) as Person,
                bob: realm.create<IPerson>("Person", {
                    name: "Bob",
                    age: 42
                }) as Person,
                charlie: realm.create<IPerson>("Person", {
                    name: "Charlie",
                    age: 62
                }) as Person
            };
            dogs = {
                max: realm.create<IDog>("Dog", {
                    age: 1,
                    name: "Max",
                    owner: persons.alice
                }) as Dog,
                rex: realm.create<IDog>("Dog", {
                    age: 3,
                    name: "Rex",
                    owner: persons.alice
                }) as Dog,
                bobby: realm.create<IDog>("Dog", {
                    age: 5,
                    name: "Bobby",
                    owner: persons.bob
                }) as Dog
            };
            // Make Bob and Charlie frieds
            persons.bob.friends.push(persons.charlie);
            persons.charlie.friends.push(persons.bob);
        });
    });

    it("returns an instance of Results", () => {
        const results = realm.objects("Person");
        expect(results).instanceOf(Realm.Results);
    });

    it("throws if object schema doesn't exist", () => {
        expect(() => {
            realm.objects("SomeOtherClass");
        }).throws("Object type 'SomeOtherClass' not found in schema.");
    });

    type CollectionCallback = () => Realm.Collection<any>;

    function itCanIterate(
        getCollection: CollectionCallback,
        expectedNames: string[]
    ) {
        it("iterates using forEach", () => {
            const collection = getCollection();
            const names: string[] = [];
            collection.forEach(person => {
                names.push(person.name);
            });
            expect(names).deep.equals(expectedNames);
        });

        it("iterates using map", () => {
            const collection = getCollection();
            const names = collection.map(person => person.name);
            expect(names).deep.equals(expectedNames);
        });

        it("iterates using indexed for-loop", () => {
            const collection = getCollection();
            const names: string[] = [];
            // tslint:disable-next-line:prefer-for-of
            for (let i = 0; i < collection.length; i++) {
                const person = collection[i];
                names.push(person.name);
            }
            expect(names).deep.equals(expectedNames);
        });

        it("iterates using for-in-loop", () => {
            const collection = getCollection();
            const names: string[] = [];
            for (const i in collection) {
                if (collection.hasOwnProperty(i)) {
                    const person = collection[i];
                    names.push(person.name);
                }
            }
            expect(names).deep.equals(expectedNames);
        });

        it("iterates using for-of-loop", () => {
            const collection = getCollection();
            const names: string[] = [];
            // tslint:disable-next-line:prefer-for-of
            for (const person of collection) {
                names.push(person.name);
            }
            expect(names).deep.equals(expectedNames);
        });

        it("iterates using values for-of-loop", () => {
            const collection = getCollection();
            const names: string[] = [];
            // tslint:disable-next-line:prefer-for-of
            for (const person of collection.values()) {
                names.push(person.name);
            }
            expect(names).deep.equals(expectedNames);
        });

        it("iterates using for-of-loop entries", () => {
            const collection = getCollection();
            const names: string[] = [];
            for (const [p, person] of collection.entries()) {
                names.push(person.name);
            }
            expect(names).deep.equals(expectedNames);
        });
    }

    describe("unfiltered results", () => {
        itCanIterate(() => realm.objects<IPerson>("Person"), [
            "Alice",
            "Bob",
            "Charlie"
        ]);
    });

    describe("filtered results", () => {
        itCanIterate(
            () => realm.objects<IPerson>("Person").filtered("age > 60"),
            ["Charlie"]
        );
    });

    describe("linkingObjects collections", () => {
        itCanIterate(() => {
            return persons.alice.dogs;
        }, ["Max", "Rex"]);
    });

    describe("lists", () => {
        itCanIterate(() => {
            return persons.bob.friends;
        }, ["Charlie"]);
    });
});
