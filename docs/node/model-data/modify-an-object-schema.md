# Change an Object Model - Node.js SDK
## Schema Version
A **schema version** identifies the state of a realm schema at some point in time. Realm tracks the
schema version of each realm and uses it to map the objects in each
realm to the correct schema.

Schema versions are ascending integers that you can optionally include
in the realm configuration when you open a realm. If a client
application does not specify a version number when it opens a realm then
the realm defaults to version `0`.

> **IMPORTANT:**
> Migrations must update a realm to a
higher schema version. Realm will throw an error if a client
application opens a realm with a schema version that is lower than
the realm's current version or if the specified schema version is the
same as the realm's current version but includes different
object schemas.
>

## Migrations
A **migration** is a function that updates a realm and any objects it
contains from one schema version to a newer
version. Migrations give you the flexibility to change your object schemas over
time to accommodate new features and refactors.

> **TIP:**
> When developing or debugging your application, you may prefer to delete
the realm instead of migrating it. Use the
`deleteRealmIfMigrationNeeded` flag to delete the database
automatically when a schema mismatch would require a migration.
>
> Never release an app to production with this flag set to `true`.
>

Whenever you open an existing realm with a schema version greater than the
realm's current version, Realm runs a migration function that you define.
The function has access to the realm's version number and incrementally
updates objects in the realm to conform to the new schema.

Realm automatically migrates certain changes, such as new and deleted
properties, but does not automatically set values for new properties unless the
updated object schema specifies a default value. You can define additional logic
in the migration function to further customize property values.

## Add a Property
To add a property to a schema, add the new property to the object's class and
set a `schemaVersion` of the `realm's configuration object`.

> Example:
> A realm using schema version `1` has a `Person` object type with a
`firstName`, and `lastName` property. The developer decides to add an
`age` property to the `Person` class.
>
> To migrate the realm to conform to the updated `Person` schema, the
developer sets the realm's schema version to
`2`.
>
> #### Javascript
>
> ```javascript
> const Person = {
>   name: 'Person',
>   properties: {
>     firstName: 'string',
>     lastName: 'string',
>     age: 'int'
>   }
> }
>
> ```
>
>
> #### Javascript
>
> ```javascript
> const realm = await Realm.open({
>     schema: [Person],
>     schemaVersion: 2
>   });
> ```
>
>

## Delete a Property
To delete a property from a schema, remove the property from the object's class
and set a `schemaVersion` of the `realm's configuration object`. Deleting a property will not impact existing
objects.

> Example:
> A realm using schema version `1` has a `Dog` object type with a
`weight` property. The developer decides to remove the property from the
schema.
>
> To migrate the realm to conform to the updated `Dog` schema, the
developer sets the realm's schema version to
`2`.
>
> #### Javascript
>
> ```javascript
> const realm = await Realm.open({
>     schema: [Dog],
>     schemaVersion: 2
>   });
> ```
>
>

## Rename a Property
To rename an object property, change the property name in the object schema and
then open the realm with an incremented schema version and a migration function that
updates existing objects to use the new property name.

Migrations do not allow you to directly rename a property. Instead you can
create a new property with the updated name, copy the value from the old
property, and then delete the old property.

> Example:
> A realm using schema version `1` has a `Person` object type. The
original schema had a `firstName` and `lastName` field. The developer
later decides that the `Person` class should use a combined `fullName`
field and removes the separate `firstName` and `lastName` fields.
>
> To migrate the realm to conform to the updated `Person` schema, the
developer sets the realm's schema version to
`2` and defines a migration function to set the value of `fullName` based
on the existing `firstName` and `lastName` properties.
>
> #### Javascript
>
> ```javascript
> Realm.open({
>   schema: [Person],
>   schemaVersion: 2,
>   onMigration: (oldRealm, newRealm) => {
>     // only apply this change if upgrading to schemaVersion 2
>     if (oldRealm.schemaVersion < 2) {
>       const oldObjects = oldRealm.objects('Person');
>       const newObjects = newRealm.objects('Person');
>
>       // loop through all objects and set the fullName property in the new schema
>       for (const objectIndex in oldObjects) {
>         const oldObject = oldObjects[objectIndex];
>         const newObject = newObjects[objectIndex];
>         newObject.fullName = `${oldObject.firstName} ${oldObject.lastName}`;
>       }
>     }
>   }
> });
>
> ```
>
>

## Modify a Property Type
To modify a property's type, set the property type of the field that you wish to
modify to the new data type. Then, set a `schemaVersion`, and a `migration`
callback function of the `realm's configuration Object`.

> Example:
> A realm using schema version `1` has a `Dog` object type. The
original schema had an `_id` with a property type of `Object ID`. The
developer later decides that the `Dog` class's `_id` field should be of
type `string`, and updates the schema.
>
> To migrate the realm to conform to the updated `Dog` schema, the
developer sets the realm's schema version to
`2` and defines a migration function to convert the `Object ID` type to a
`string` type.
>
> #### Javascript
>
> ```javascript
> const realm = await Realm.open({
>     schema: [Dog],
>     schemaVersion: 2,
>     onMigration: (oldRealm, newRealm) => {
>         if(oldRealm.schemaVersion < 2){
>             const oldObjects = oldRealm.objects('Dog');
>             const newObjects = newRealm.objects('Dog');
>             // loop through all objects and set the _id property in the new schema
>             for (const objectIndex in oldObjects) {
>               const oldObject = oldObjects[objectIndex];
>               const newObject = newObjects[objectIndex];
>               newObject._id = oldObject._id.toHexString();
>             }
>         }
>     },
>   });
> ```
>
>
