import { expect } from "chai";

import { IPerson, PersonSchema } from "./schemas/person-and-dogs";
import * as circularCollectionResult from "./structures/circular-collection-result.json"

const createRealmWithCircularStructure = () => {
    const realm = new Realm({ schema: [PersonSchema] });

    realm.write(() => {
        const john = realm.create<IPerson>(PersonSchema.name, {
            name: "John Doe",
            age: 42,
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

    return realm;
};

describe("JSON serialization", () => {

    it("JsonSerializationReplacer is exposed on the Realm constructor", () => {
        expect(typeof Realm.JsonSerializationReplacer).equal('function');
        expect(Realm.JsonSerializationReplacer.length).equal(2);
    });

    describe("Realm.Object", () => {
        let john!: IPerson & Realm.Object;

        beforeEach(() => {
            const realm = createRealmWithCircularStructure();
            john = realm.objects<IPerson>(PersonSchema.name)[0];
        })

        it("implements toJSON", () => {
            expect(typeof john.toJSON).equals('function');
        });

        it("toJSON returns a circular structure", () => {
            const serializable = john.toJSON();

            expect(serializable.objectSchema).equals(undefined);
            expect(serializable.friends).instanceOf(Array);
            expect(serializable).equal(serializable.friends[0]);
        });
    
        it("throws correct error on serialization", () => {
            expect(() => JSON.stringify(john)).throws(TypeError)
                .property("message", "Converting circular structure to JSON");
        });

        it("serializes to expected output using Realm.JsonSerializationReplacer", () => {
            expect(JSON.stringify(john, Realm.JsonSerializationReplacer))
                .equals(JSON.stringify(circularCollectionResult[0]));
        })
    });

    describe("Realm.Results", () => {
        let persons!: Realm.Results<IPerson & Realm.Object>;

        beforeEach(() => {
            const realm = createRealmWithCircularStructure();
            persons = realm.objects<IPerson>(PersonSchema.name);
        })

        it("implements toJSON", () => {
            expect(typeof persons.toJSON).equals('function');
        });

        it("toJSON returns a circular structure", () => {
            const serializable = persons.toJSON();

            expect(serializable).instanceOf(Array);
            expect(serializable[0].friends).instanceOf(Array);
            expect(serializable[0]).equal(serializable[0].friends[0]);
        });

        it("throws correct error on serialization", () => {
            expect(() => JSON.stringify(persons)).throws(TypeError)
                .property("message", "Converting circular structure to JSON");
        });

        it("serializes to expected output using Realm.JsonSerializationReplacer", () => {
            expect(JSON.stringify(persons, Realm.JsonSerializationReplacer))
                .equal(JSON.stringify(circularCollectionResult));
        })
    });
});
