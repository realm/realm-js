# Change an Object Model - React Native SDK

When updating your object schema, you must increment the schema version
and perform a migration.

If your schema update adds optional properties or removes properties,
Realm can perform the migration automatically. You only need to
increment the `schemaVersion`.

For more complex schema updates, you must also manually specify the migration logic
in a `migration` function. This might include changes such as:

- Adding required properties that must be populated with default values
- Combining fields
- Renaming a field
- Changing a field's type
- Converting from an object to an embedded object

> **TIP:**
> When developing or debugging your application, you may prefer to delete the
realm instead of migrating it. Use the
`BaseConfiguration.deleteRealmIfMigrationNeeded` property to delete
the database automatically
when a schema mismatch requires a migration.
>
> Never release an app to production with this property set to `true`.
>

## Schema Version
A **schema version** identifies the state of a realm schema at some point in time. Realm tracks the
schema version of each realm and uses it to map the objects in each
realm to the correct schema.

Schema versions are ascending integers you can include in the realm
configuration. If a client application does not specify a version number, the
realm defaults to version `0`.

> **IMPORTANT:**
> Migrations must update a realm to a higher
schema version. Realm throws an error if a client application
uses a schema version that is lower than the realm's current version or if
the specified schema version is the same as the realm's current version but
includes a different schema.
>

## Migrations
A **migration** is a function that updates a realm and any objects it contains
from one schema version to a newer version.
Migrations allow you to change your object schemas over time to accommodate new
features and refactors.

When you create a `Configuration`
with a schema version greater than the
realm's current version, Realm runs a migration function that you define.
The function has access to the realm's version number and incrementally
updates objects in the realm to conform to the new schema.

Realm automatically migrates certain changes, such as new and deleted
properties, but does not automatically set values for new properties unless the
updated object schema specifies a default value. You can define additional logic
in the migration function to further customize property values.

## Add a Property
To add a property to a schema, add the new property to the object's class and
set a `schemaVersion` of the `Configuration` object.

> Example:
> A realm using schema version `0`, the
default, has a `Person` object type with a `firstName` and `lastName`
property. You decide to add an `age` property to the `Person` class.
>
> To migrate the realm to conform to the updated `Person` schema, you set the
realm's schema version in the `Configuration` to `1`. Finally, pass
the configuration object to the `createRealmContext()` method.
>
> #### Javascript
>
> ```javascript
> class Person extends Realm.Object {
>   static schema = {
>     name: 'Person',
>     properties: {
>       _id: 'string',
>       firstName: 'string',
>       lastName: 'string',
>       // add a new property, 'age' to the schema
>       age: 'int',
>     },
>   };
> }
>
> const config = {
>   schema: [Person],
>   // Increment the 'schemaVersion', since 'age' has been added to the schema.
>   // The initial schemaVersion is 0.
>   schemaVersion: 2,
> };
>
> // pass the configuration object with the updated 'schemaVersion' to
> // createRealmContext()
> const {RealmProvider} = createRealmContext(config);
>
> ```
>
>
> #### Typescript
>
> ```typescript
> class Person extends Realm.Object<Person> {
>   _id!: string;
>   firstName!: string;
>   lastName!: string;
>   age!: number;
>
>   static schema: ObjectSchema = {
>     name: 'Person',
>     properties: {
>       _id: 'string',
>       firstName: 'string',
>       lastName: 'string',
>       // add a new property, 'age' to the schema
>       age: 'int',
>     },
>   };
> }
>
> const config: Realm.Configuration = {
>   schema: [Person],
>   // Increment the 'schemaVersion', since 'age' has been added to the schema.
>   // The initial schemaVersion is 0.
>   schemaVersion: 2,
> };
>
> // pass the configuration object with the updated 'schemaVersion' to
> // createRealmContext()
> const {RealmProvider} = createRealmContext(config);
>
> ```
>
>

## Delete a Property
To delete a property from a schema, remove the property from the object's class
and set a `schemaVersion` of the `Configuration` object. Deleting a property will not
impact existing objects.

> Example:
> A realm using schema version `0`, the
default, has a `Person` object type with a `lastName` property. You
decide to remove the property from the schema.
>
> To migrate the realm to conform to the updated `Person` schema, set the
realm's schema version to `1` in the `Configuration` object. Finally, pass
the configuration object to the `createRealmContext()` method.
>
> #### Javascript
>
> ```javascript
> class Person extends Realm.Object {
>   static schema = {
>     name: 'Person',
>     properties: {
>       _id: 'string',
>       firstName: 'string',
>       age: 'int',
>     },
>   };
> }
>
> const config = {
>   schema: [Person],
>   // Increment the 'schemaVersion', since 'lastName' has been removed from the schema.
>   // The initial schemaVersion is 0.
>   schemaVersion: 1,
> };
>
> // pass the configuration object with the updated 'schemaVersion' to createRealmContext()
> const {RealmProvider} = createRealmContext(config);
>
> ```
>
>
> #### Typescript
>
> ```typescript
> class Person extends Realm.Object<Person> {
>   _id!: string;
>   firstName!: string;
>   age!: number;
>
>   static schema: ObjectSchema = {
>     name: 'Person',
>     properties: {
>       _id: 'string',
>       firstName: 'string',
>       age: 'int',
>     },
>   };
> }
>
> const config: Realm.Configuration = {
>   schema: [Person],
>   // Increment the 'schemaVersion', since 'lastName' has been removed from the schema.
>   // The initial schemaVersion is 0.
>   schemaVersion: 1,
> };
>
> // pass the configuration object with the updated 'schemaVersion' to createRealmContext()
> const {RealmProvider} = createRealmContext(config);
>
> ```
>
>

## Rename a Property
To rename an object property, change the property name in the object schema and
then create a realm configuration with an incremented schema version and a migration
function that updates existing objects to use the new property name.

Migrations do not allow you to directly rename a property. Instead, you can
create a new property with the updated name, copy the value from the old
property, and then delete the old property.

> Example:
> A realm using schema version `0`, the
default, has a `Person` object type. The original schema had a `firstName`
and `lastName` field. You later decide that the `Person` class should
use a combined `fullName` field and removes the separate `firstName`
and `lastName` fields.
>
> To migrate the realm to conform to the updated `Person` schema,
> create a
> `Configuration`
> object
and set the realm's schema version to `1`, and define a migration function
that sets the value of `fullName` based on the existing `firstName` and
`lastName` properties. Finally, pass the configuration object to the
`createRealmContext()` method.
>
> #### Javascript
>
> ```javascript
> class Person extends Realm.Object {
>   static schema = {
>     name: 'Person',
>     properties: {
>       _id: 'string',
>       // rename the 'firstName' and 'lastName' property, to 'fullName'
>       // in the schema
>       fullName: 'string',
>       age: 'int',
>     },
>   };
> }
>
> const config = {
>   schema: [Person],
>   // Increment the 'schemaVersion', since 'fullName' has replaced
>   // 'firstName' and 'lastName' in the schema.
>   // The initial schemaVersion is 0.
>   schemaVersion: 1,
>   onMigration: (oldRealm, newRealm) => {
>     // only apply this change if upgrading schemaVersion
>     if (oldRealm.schemaVersion < 1) {
>       const oldObjects = oldRealm.objects(Person);
>       const newObjects = newRealm.objects(Person);
>       // loop through all objects and set the fullName property in the
>       // new schema
>       for (const objectIndex in oldObjects) {
>         const oldObject = oldObjects[objectIndex];
>         const newObject = newObjects[objectIndex];
>         newObject.fullName = `${oldObject.firstName} ${oldObject.lastName}`;
>       }
>     }
>   },
> };
>
> // pass the configuration object with the updated 'schemaVersion' and
> // 'migration' function to createRealmContext()
> const {RealmProvider} = createRealmContext(config);
>
> ```
>
>
> #### Typescript
>
> ```typescript
> class Person extends Realm.Object<Person> {
>   _id!: string;
>   fullName!: string;
>   age!: number;
>
>   static schema: ObjectSchema = {
>     name: 'Person',
>     properties: {
>       _id: 'string',
>       // rename the 'firstName' and 'lastName' property, to 'fullName'
>       // in the schema
>       fullName: 'string',
>       age: 'int',
>     },
>   };
> }
>
> class OldObjectModel extends Realm.Object<OldObjectModel> {
>   _id!: string;
>   firstName!: string;
>   lastName!: string;
>   age!: number;
>
>   static schema: ObjectSchema = {
>     name: 'Person',
>     properties: {
>       _id: 'string',
>       firstName: 'string',
>       lastName: 'string',
>     },
>   };
> }
>
> const config: Realm.Configuration = {
>   schema: [Person],
>   // Increment the 'schemaVersion', since 'fullName' has replaced
>   // 'firstName' and 'lastName' in the schema.
>   // The initial schemaVersion is 0.
>   schemaVersion: 1,
>   onMigration: (oldRealm: Realm, newRealm: Realm) => {
>     // only apply this change if upgrading schemaVersion
>     if (oldRealm.schemaVersion < 1) {
>       const oldObjects: Realm.Results<OldObjectModel> =
>         oldRealm.objects(OldObjectModel);
>       const newObjects: Realm.Results<Person> = newRealm.objects(Person);
>       // loop through all objects and set the fullName property in the
>       // new schema
>       for (const objectIndex in oldObjects) {
>         const oldObject = oldObjects[objectIndex];
>         const newObject = newObjects[objectIndex];
>         newObject.fullName = `${oldObject.firstName} ${oldObject.lastName}`;
>       }
>     }
>   },
> };
>
> // pass the configuration object with the updated 'schemaVersion' and
> // 'migration' function to createRealmContext()
> const {RealmProvider} = createRealmContext(config);
>
> ```
>

## Modify a Property Type
To modify a property's type, set the property type of the field that you wish to
modify to the new data type. Then, set a `schemaVersion`, and a `migration`
callback function of the `Configuration` object.

> Example:
> A realm using schema version `0`, the
default, has a `Person` object type. The original schema had an `_id`
with a property type of `int`. You later decide that the `Person` class's
`_id` field should be of type `ObjectId`, and updates the schema.
>
> To migrate the realm to conform to the updated `Person` schema, create a
`Configuration` object and set the realm's schema version to `1`, and
define a migration function to convert the integer type to an `Object ID`
type. Finally, pass the configuration object to the
`createRealmContext()` method.
>
> #### Javascript
>
> ```javascript
> class Person extends Realm.Object {
>   static schema = {
>     name: 'Person',
>     properties: {
>       // update the data type of '_id' to be 'objectId' within the schema
>       _id: 'objectId',
>       firstName: 'string',
>       lastName: 'string',
>     },
>   };
> }
>
> const config = {
>   schema: [Person],
>   // Increment the 'schemaVersion', since the property type of '_id'
>   // has been modified.
>   // The initial schemaVersion is 0.
>   schemaVersion: 1,
>   onMigration: (oldRealm, newRealm) => {
>     if (oldRealm.schemaVersion < 1) {
>       const oldObjects = oldRealm.objects(Person);
>       const newObjects = newRealm.objects(Person);
>       // loop through all objects and set the _id property
>       // in the new schema
>       for (const objectIndex in oldObjects) {
>         const oldObject = oldObjects[objectIndex];
>         const newObject = newObjects[objectIndex];
>         newObject._id = new Realm.BSON.ObjectId(oldObject._id);
>       }
>     }
>   },
> };
>
> // Pass the configuration object with the updated
> // 'schemaVersion' and 'migration' function to createRealmContext()
> const {RealmProvider} = createRealmContext(config);
>
> ```
>
>
> #### Typescript
>
> ```typescript
> class Person extends Realm.Object<Person> {
>   _id!: Realm.BSON.ObjectId;
>   firstName!: string;
>   lastName!: string;
>   age!: number;
>
>   static schema: ObjectSchema = {
>     name: 'Person',
>     properties: {
>       // Update the data type of '_id' to be 'objectId' within the schema.
>       _id: 'objectId',
>       firstName: 'string',
>       lastName: 'string',
>     },
>   };
> }
>
> // `OldObjectModel` is only used for type injection for `oldRealm`. It is
> // not related to the `Person` object model.
> interface OldObjectModel {
>   _id: Realm.BSON.ObjectId;
>   firstName: string;
>   lastName: string;
>   age: number;
> }
>
> const config: Realm.Configuration = {
>   schema: [Person],
>   // Increment the 'schemaVersion', since the property type of '_id'
>   // has been modified.
>   // The initial schemaVersion is 0.
>   schemaVersion: 1,
>   onMigration: (oldRealm: Realm, newRealm: Realm) => {
>     if (oldRealm.schemaVersion < 1) {
>       const oldObjects: Realm.Results<OldObjectModel> =
>         oldRealm.objects(Person);
>       const newObjects: Realm.Results<Person> = newRealm.objects(Person);
>       // Loop through all objects and set the _id property
>       // in the new schema.
>       for (const objectIndex in oldObjects) {
>         const oldObject = oldObjects[objectIndex];
>         const newObject = newObjects[objectIndex];
>         newObject._id = new Realm.BSON.ObjectId(oldObject._id);
>       }
>     }
>   },
> };
>
> // Pass the configuration object with the updated
> // 'schemaVersion' and 'migration' function to createRealmContext().
> const {RealmProvider} = createRealmContext(config);
>
> ```
>
>
