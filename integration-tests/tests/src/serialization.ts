import { expect } from "chai";

import { IPerson, PersonSchema } from "./schemas/person-and-dogs";
import * as expectedCircularStructure from "./structures/circular-result.json"

describe("Serialization", () => {
    it("JsonSerializationReplacer is exposed on the Realm constructor", () => {
        expect(typeof Realm.JsonSerializationReplacer).equal('function');
        expect(Realm.JsonSerializationReplacer.length).equal(2);
    })

    it("Realm.Object has 'toJSON' implemented", () => {
        const realm = new Realm({ schema: [PersonSchema] });

        let john!: IPerson & Realm.Object;

        realm.write(() => {
            john = realm.create<IPerson>("Person", {
                name: "John Doe",
                age: 42
            });

            john.friends.push(john)
        });

        expect(typeof john.toJSON).equals('function');
        expect(john.toJSON().objectSchema).equals(undefined);
        expect(john.toJSON().friends).instanceOf(Array);
    });

    it("Realm.Results (Collection) has 'toJSON' implemented", () => {
        const realm = new Realm({ schema: [PersonSchema] });

        let john!: IPerson & Realm.Object;

        realm.write(() => {
            john = realm.create<IPerson>("Person", {
                name: "John Doe",
                age: 42
            });
        });

        const persons = realm.objects<IPerson>("Person");

        expect(typeof persons.toJSON).equals('function');
        expect(persons.toJSON()).instanceOf(Array);

        const first = persons.toJSON()[0];
        expect(first.objectSchema).equals(undefined);
        expect(first.friends).instanceOf(Array);
    });

    it("Realm.Results can be serialized with circular references", () => {
        const realm = new Realm({ schema: [PersonSchema] });

        let john!: IPerson & Realm.Object;
        let jane!: IPerson & Realm.Object;
        let tony!: IPerson & Realm.Object;

        realm.write(() => {
            john = realm.create<IPerson>("Person", {
                name: "John Doe",
                age: 42
            });
            jane = realm.create<IPerson>("Person", {
                name: "Jane Doe",
                age: 40
            });
            tony = realm.create<IPerson>("Person", {
                name: "Tony Doe",
                age: 35
            });

            // ensure circular references
            john.friends.push(jane);
            john.friends.push(tony);

            jane.friends.push(tony);
            jane.friends.push(john);
            
            tony.friends.push(jane);
        });

        const persons = realm.objects<IPerson>("Person");

        expect(JSON.stringify(persons, Realm.JsonSerializationReplacer))
            .equal(JSON.stringify(expectedCircularStructure));
    });
});
