import * as Realm from "realm";

const CAT_NAMES = ["Molly", "Felix", "Smudge", "Sooty", "Tigger", "Charlie", "Alfie", "Oscar", "Millie", "Misty"];

const HUMAN_NAMES = ["Oliver", "George", "Harry", "Jack", "Jacob", "Noah", "Charlie", "Muhammad", "Thomas", "Oscar"];

const CatSchema = {
  name: "Cat",
  properties: {
    _id: "objectId",
    name: "string",
    age: "int",
    owners: "Owner[]",
  },
};

const OwnerSchema = {
  name: "Owner",
  properties: {
    _id: "objectId",
    name: "string",
    age: "int",
  },
};

class CatClass {
  name!: string;
  age!: number;
  owners!: OwnerClass[];
}

class OwnerClass {
  name!: string;
  age!: number;
}

const go = async () => {
  const realm = await Realm.open({
    schema: [CatSchema, OwnerSchema],
  });

  if (realm.objects("Cat").length === 0) {
    console.log("Creating cats and their owners...");

    realm.write(() => {
      let owners: any[] = [];

      HUMAN_NAMES.forEach((name, i) => {
        owners.push(
          realm.create("Owner", {
            _id: new Realm.BSON.ObjectID(),
            name,
            age: 20 + i,
          }),
        );
      });

      CAT_NAMES.forEach((name, i) => {
        owners.sort(() => Math.random() - 0.5);

        realm.create("Cat", {
          _id: new Realm.BSON.ObjectID(),
          name: name,
          age: i,
          owners: owners.slice(0, Math.random() * 5),
        });
      });
    });
  }

  const AGE = 3;

  // Filter Realm objects using Javascript syntax + Typescript completion
  const filteredCats = realm
    .objects<CatClass>("Cat")
    .filterQuery(
      (cat) => cat.age < AGE && cat.owners.any().age > 27 && cat.name.like("*e*", true) && cat.owners.count() > 2 || cat.owners.name.like("*ac*"),
    );

  const filteredCatsByAge = realm.objects<CatClass>("Cat").filterQuery(
    (cat) => cat.age < AGE,
    // Needs dependency array so it can sub in the value of AGE :/
    () => [AGE],
  );

  filteredCats.forEach((cat) =>
    console.log(
      `Name: ${cat.name}, age: ${cat.age}, owners: ${cat.owners
        .map((o) => `name: ${o.name}, age: ${o.age}`)
        .join(", ")}`,
    ),
  );

  realm.close();
};

go();
