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

import { expect } from "chai";

import {
    Dog as DogWithId,
    DogSchema as DogSchemaWithId,
    IPerson as IPersonWithId,
    Person as PersonWithId,
    PersonSchema as PersonSchemaWithId
} from "./schemas/person-and-dog-with-primary-ids";
import {
    Dog,
    DogSchema,
    IPerson,
    Person,
    PersonSchema
} from "./schemas/person-and-dogs";
import * as circularCollectionResultWithIds from "./structures/circular-collection-result-with-primary-ids.json";
import * as circularCollectionResult from "./structures/circular-collection-result.json";

describe("JSON serialization (exposed properties)", () => {
    it("JsonSerializationReplacer is exposed on the Realm constructor", () => {
        expect(typeof Realm.JsonSerializationReplacer).equals("function");
        expect(Realm.JsonSerializationReplacer.length).equals(2);
    });
});

interface ITestSetup {
    name: string;
    testData: () => {
        realm: Realm;
        predefinedStructure: any;
    };
}

const testSetups: ITestSetup[] = [
    {
        name: "Object literal",
        testData: () => {
            const realm = new Realm({
                schema: [PersonSchema, DogSchema],
                inMemory: true
            });

            realm.write(() => {
                const john = realm.create<IPerson>(PersonSchema.name, {
                    name: "John Doe",
                    age: 42
                });
                const jane = realm.create<IPerson>(PersonSchema.name, {
                    name: "Jane Doe",
                    age: 40
                });
                const tony = realm.create<IPerson>(PersonSchema.name, {
                    name: "Tony Doe",
                    age: 35
                });

                // ensure circular references
                john.friends.push(john);
                john.friends.push(jane);
                john.friends.push(tony);

                jane.friends.push(tony);
                jane.friends.push(john);

                tony.friends.push(jane);
            });

            return {
                realm,
                predefinedStructure: circularCollectionResult
            };
        }
    },
    {
        name: "Class models",
        testData: () => {
            const realm = new Realm({ schema: [Person, Dog], inMemory: true });

            realm.write(() => {
                const john = realm.create(Person, {
                    name: "John Doe",
                    age: 42
                });
                const jane = realm.create(Person, {
                    name: "Jane Doe",
                    age: 40
                });
                const tony = realm.create(Person, {
                    name: "Tony Doe",
                    age: 35
                });

                // ensure circular references
                john.friends.push(john);
                john.friends.push(jane);
                john.friends.push(tony);

                jane.friends.push(tony);
                jane.friends.push(john);

                tony.friends.push(jane);
            });

            return {
                realm,
                predefinedStructure: circularCollectionResult
            };
        }
    },
    {
        name: "Object literal with primary _id",
        testData: () => {
            const realm = new Realm({
                schema: [PersonSchemaWithId, DogSchemaWithId],
                inMemory: true
            });

            realm.write(() => {
                const john = realm.create<IPersonWithId>(
                    PersonSchemaWithId.name,
                    {
                        _id: "prim-id-1",
                        name: "John Doe",
                        age: 42
                    }
                );
                const jane = realm.create<IPersonWithId>(
                    PersonSchemaWithId.name,
                    {
                        _id: "prim-id-2",
                        name: "Jane Doe",
                        age: 40
                    }
                );
                const tony = realm.create<IPersonWithId>(
                    PersonSchemaWithId.name,
                    {
                        _id: "prim-id-3",
                        name: "Tony Doe",
                        age: 35
                    }
                );

                // ensure circular references
                john.friends.push(john);
                john.friends.push(jane);
                john.friends.push(tony);

                jane.friends.push(tony);
                jane.friends.push(john);

                tony.friends.push(jane);
            });

            return {
                realm,
                predefinedStructure: circularCollectionResultWithIds
            };
        }
    },
    {
        name: "Class models with primary _id",
        testData: () => {
            const realm = new Realm({
                schema: [PersonWithId, DogWithId],
                inMemory: true
            });

            realm.write(() => {
                const john = realm.create(PersonWithId, {
                    _id: "prim-id-1",
                    name: "John Doe",
                    age: 42
                });
                const jane = realm.create(PersonWithId, {
                    _id: "prim-id-2",
                    name: "Jane Doe",
                    age: 40
                });
                const tony = realm.create(PersonWithId, {
                    _id: "prim-id-3",
                    name: "Tony Doe",
                    age: 35
                });

                // ensure circular references
                john.friends.push(john);
                john.friends.push(jane);
                john.friends.push(tony);

                jane.friends.push(tony);
                jane.friends.push(john);

                tony.friends.push(jane);
            });

            return {
                realm,
                predefinedStructure: circularCollectionResultWithIds
            };
        }
    }
];

describe("JSON serialization", () => {
    let testSetup: ITestSetup;
    let realm: Realm | null;
    let predefinedStructure: any;
    let persons: Realm.Results<any>;

    beforeEach(() => {
        ({ realm, predefinedStructure } = testSetup.testData());
        persons = realm.objects(PersonSchema.name).sorted("age", true);
    });

    afterEach(() => {
        if (realm) {
            realm.write(() => {
                realm.deleteAll();
            });
            realm.close();
            realm = null;
        }
    });

    testSetups.forEach(ts => {
        // expose testSetup to predefined before/after hooks
        testSetup = ts;

        describe(`Repeated test for "${testSetup.name}":`, () => {
            describe("Realm.Object", () => {
                it("implements toJSON", () => {
                    expect(typeof persons[0].toJSON).equals("function");
                });

                it("toJSON returns a circular structure", () => {
                    const serializable = persons[0].toJSON();

                    expect(serializable.objectSchema).equals(undefined);
                    expect(serializable.friends).instanceOf(Array);
                    expect(serializable).equals(serializable.friends[0]);
                });

                it("throws correct error on serialization", () => {
                    expect(() => JSON.stringify(persons[0])).throws(
                        "Converting circular structure to JSON"
                    );
                });

                it("serializes to expected output using Realm.JsonSerializationReplacer", () => {
                    expect(
                        JSON.stringify(
                            persons[0],
                            Realm.JsonSerializationReplacer
                        )
                    ).equals(JSON.stringify(predefinedStructure[0]));
                });
            });

            describe("Realm.Results", () => {
                it("implements toJSON", () => {
                    expect(typeof persons.toJSON).equals("function");
                });

                it("toJSON returns a circular structure", () => {
                    const serializable = persons.toJSON();

                    expect(serializable).instanceOf(Array);
                    expect(serializable[0].friends).instanceOf(Array);
                    expect(serializable[0]).equals(serializable[0].friends[0]);
                });

                it("throws correct error on serialization", () => {
                    expect(() => JSON.stringify(persons)).throws(
                        "Converting circular structure to JSON"
                    );
                });

                it("serializes to expected output using Realm.JsonSerializationReplacer", () => {
                    expect(
                        JSON.stringify(persons, Realm.JsonSerializationReplacer)
                    ).equals(JSON.stringify(predefinedStructure));
                });
            });
        });
    });
});
