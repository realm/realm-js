import { expect } from "chai";
import {
    IPerson as IPersonWithId,
    Person as PersonWithId,
    PersonSchema as PersonSchemaWithId
} from "./schemas/person-and-dog-with-primary-ids";
import { IPerson, Person, PersonSchema } from "./schemas/person-and-dogs";

describe("Realm objects", () => {
    describe("Interface & object literal", () => {
        it("can be created", () => {
            const realm = new Realm({ schema: [PersonSchema] });
            let john: IPerson;

            realm.write(() => {
                john = realm.create<IPerson>(PersonSchema.name, {
                    name: "John Doe",
                    age: 42
                });
            });

            // Expect John to be the one and only result
            const persons = realm.objects(PersonSchema.name);
            expect(persons.length).equals(1);
            const [firstPerson] = persons;
            expect(firstPerson).deep.equals(john);
        });

        it("can have it's properties read", () => {
            const realm = new Realm({ schema: [PersonSchema] });
            let john: IPerson;

            realm.write(() => {
                john = realm.create<IPerson>(PersonSchema.name, {
                    name: "John Doe",
                    age: 42
                });
            });

            expect(john.name).equals("John Doe");
            expect(john.age).equals(42);
        });

        it("can be updated", () => {
            const realm = new Realm({ schema: [PersonSchemaWithId] });
            let john: IPersonWithId;
            const _id = "8ef4d2e2-a8be-468d-995d-36068d15b520";

            realm.write(() => {
                john = realm.create<IPersonWithId>(PersonSchemaWithId.name, {
                    _id,
                    name: "John Doe",
                    age: 42
                });
            });

            expect(john.name).equals("John Doe");
            expect(john.age).equals(42);

            realm.write(() => {
                realm.create<IPersonWithId>(
                    PersonSchemaWithId.name,
                    { _id, age: 43 },
                    Realm.UpdateMode.All
                );
            });

            expect(john.name).equals("John Doe");
            expect(john.age).equals(43);

            const update: Partial<IPersonWithId> = {
                _id,
                name: "Mr. John Doe"
            };

            realm.write(() => {
                realm.create<IPersonWithId>(
                    PersonSchemaWithId.name,
                    update,
                    Realm.UpdateMode.Modified
                );
            });

            expect(john.name).equals("Mr. John Doe");
            expect(john.age).equals(43);

            expect(() =>
                realm.write(() => {
                    realm.create<IPersonWithId>(
                        PersonSchemaWithId.name,
                        { _id, name: "John Doe", age: 42 },
                        Realm.UpdateMode.Never
                    );
                })
            ).throws(
                `Attempting to create an object of type '${
                    PersonSchemaWithId.name
                }' with an existing primary key value ''${_id}''.`
            );
        });
    });

    describe("Class Model", () => {
        it("can be created", () => {
            const realm = new Realm({ schema: [Person] });
            let john: Person;

            realm.write(() => {
                john = realm.create(Person, {
                    name: "John Doe",
                    age: 42
                });
            });
            // Expect John to be the one and only result
            const persons = realm.objects(Person);
            expect(persons.length).equals(1);
            const [firstPerson] = persons;
            expect(firstPerson).deep.equals(john);
            expect(firstPerson).instanceOf(Person);
        });

        it("can have it's properties read", () => {
            const realm = new Realm({ schema: [Person] });
            realm.write(() => {
                const john = realm.create(Person, {
                    name: "John Doe",
                    age: 42
                });
                expect(john.name).equals("John Doe");
                expect(john.age).equals(42);
            });
        });

        it("can be updated", () => {
            const realm = new Realm({ schema: [PersonWithId] });
            let john: PersonWithId;
            const _id = "e4762cd3-b92f-47ae-857a-26eba201e7db";

            realm.write(() => {
                john = realm.create(PersonWithId, {
                    _id,
                    name: "John Doe",
                    age: 42
                });
            });

            expect(john.name).equals("John Doe");
            expect(john.age).equals(42);

            realm.write(() => {
                realm.create(
                    PersonWithId,
                    { _id, age: 43 },
                    Realm.UpdateMode.All
                );
            });

            expect(john.name).equals("John Doe");
            expect(john.age).equals(43);

            const update: Partial<PersonWithId> = {
                _id,
                name: "Mr. John Doe"
            };

            realm.write(() => {
                realm.create(PersonWithId, update, Realm.UpdateMode.Modified);
            });

            expect(john.name).equals("Mr. John Doe");
            expect(john.age).equals(43);

            expect(() =>
                realm.write(() => {
                    realm.create(
                        PersonWithId,
                        { _id, name: "John Doe", age: 42 },
                        Realm.UpdateMode.Never
                    );
                })
            ).throws(
                `Attempting to create an object of type '${
                    PersonWithId.schema.name
                }' with an existing primary key value ''${_id}''.`
            );
        });
    });
});
