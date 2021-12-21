// Realm = require(".");
// Import realm
Realm = require("../../realm-js");
environment = {}
let {importApp} = require('../../realm-js/integration-tests/tests/dist/utils/import-app.js')

// Create a new app or import the app that I created
appId = "with-db-flx-lugzk"
// appId = (await importApp('with-db-flx', {}, 'all')).id

// Create schema
PersonSchema = {
  name: "Person",
  primaryKey: "_id",
  properties: {
    _id: "objectId",
    age: "int",
    name: "string",
    friends: "Person[]",
    bestFriend: "Person"
  },
};

// Create app and connect
app = new Realm.App({ baseUrl: "http://localhost:9090", id: appId });
Realm.App.Sync.setLogLevel(app, "all");

user = await app.logIn(Realm.Credentials.anonymous());


// realm = await Realm.open({
realm = new Realm({
  schema: [PersonSchema],
  // sync: { user, flexible: true }
});


// Create a subscription
subs = realm.getSubscriptions();
subs.update((m) => {
  sub = m.add(realm.objects("Person"), { name: "test" });
});

realm.write(() => p1.age++)

realm.write(() => p1 = realm.create("Person", { _id: Realm.BSON.ObjectID(), age: 122, name: "tom2" }))

realm.write(() => p2 = realm.create("Person", { _id: Realm.BSON.ObjectID(), age: 122, name: "tom3", bestFriend: p1 }))

realm.objects('Person').length


await realm.getSubscriptions().waitForSynchronization()

subs.snapshot()

realm.getSubscriptions().state

subs.update((m) => {
  sub = m.add(realm.objects("Person"), { name: "test" });
});

subs = realm.getSubscriptions();

subs.update((m) => {
  sub = m.add(realm.objects("Person").filtered("age > 15"), { name: "test2" });
});

subs.snapshot()


subs.update((m) => {
  sub = m.add(realm.objects("Person").filtered("age > 25"), { name: "test3" });
});




// TopLevelSchema = {
//   name: "TopLevel",
//   primaryKey: "_id",
//   properties: {
//     _id: "objectId",
//     partition: "string?",
//     non_queryable_field: "string?",
//     queryable_int_field: "int?",
//     queryable_str_field: "string?"
//   }
// }



// DogSchema = {
//   name: "Dog",
//   primaryKey: "_id",
//   properties: {
//     _id: "objectId",
//     age: "int",
//     name: "string",
//   },
// };

subs.snapshot().length;

// await subs.waitForSynchronization();

let sub;

subs.update((m) => {
  sub = m.add(realm.objects("TopLevel"))
});

subs.update((m) => {
  sub = m.add(realm.objects("TopLevel").filtered('queryable_int_field > 1'))
});

realm.objects('TopLevel').length;

realm.write(() => realm.create("TopLevel", { _id: Realm.BSON.ObjectID(), queryable_int_field: 2 }))

subs.update((m) => {
  sub = m.add(realm.objects("TopLevel").filtered('queryable_int_field > 3'))
});



subs.update((m) => {
  sub = m.add(realm.objects("Dog").filtered("age > 15"), { name: "test2" });
});


subs.update((m) => {
  sub = m.add(realm.objects("Cat").filtered("age > 125"), { name: "test3" });
});

let sub;
subs = subs.update((m) => {
  sub = m.add(realm.objects("Cat").filtered("age > 10"));
});

subs.waitForSynchronization(() => {
  console.log("123");
});

let sub;
q = realm.objects("Cat");
subs.update((m) => {
  sub = m.add(q, { name: "cat_sub" });
});

subs.update((m) => m.removeByName("cat_sub"));

realm.getSubscriptions().getSubscriptions();

subs.update((m) => {});

subs.update((m) => {
  m.add(realm.objects("Cat"));
  m.add(realm.objects("Cat").filtered("age > 10"));
  m.add(realm.objects("Dog"));
});

subs.update((m) => {
  m.add(realm.objects("Cat"));
});

let sub1, sub2;
subs.update((m) => {
  sub1 = m.add(realm.objects("Cat").filtered("age > 5"));
  sub2 = m.add(realm.objects("Cat").filtered("age > 10"));
});
// ---

Realm = require("./types");

PersonSchema = {
  name: "Person",
  primaryKey: "_id",
  properties: {
    _id: "objectId",
    age: "int",
    name: "string",
    friends: "Person[]",
  },
};

realm = await Realm.open({
  schema: [PersonSchema],
});

subs = realm.getSubscriptions();
let sub;
subs.update((m) => {
  sub = m.add(realm.objects("Person").filtered("age > 10"), undefined);
});

let sub1;
let sub2;
subs = realm.getSubscriptions();

subs.update(function (mutableSubs) {
  console.log(1);
  sub1 = mutableSubs.add(realm.objects("Person").filtered("age > 15"));
  console.log(2);
  sub2 = mutableSubs.add(realm.objects("Person").filtered("age > 20"));
});
