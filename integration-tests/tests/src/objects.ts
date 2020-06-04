import { expect } from "chai";

import { IPerson, PersonSchema } from "./schemas/person-and-dogs";

describe("Realm objects", () => {
    it("can be created", () => {
        const realm = new Realm({ schema: [PersonSchema] });
        let john: IPerson;
        realm.write(() => {
            john = realm.create<IPerson>("Person", {
                name: "John Doe",
                age: 42
            });
        });
        // Expect John to be the one and only result
        const persons = realm.objects("Person");
        expect(persons.length).equals(1);
        const [firstPerson] = persons;
        expect(firstPerson).deep.equals(john);
    });

    it("can have it's properties read", () => {
        const realm = new Realm({ schema: [PersonSchema] });
        realm.write(() => {
            const john = realm.create<IPerson>("Person", {
                name: "John Doe",
                age: 42
            });
            expect(john.name).equals("John Doe");
            expect(john.age).equals(42);
        });
    });
});
