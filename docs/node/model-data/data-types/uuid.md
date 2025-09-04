# UUID - Node.js SDK
> Version added: 10.5.0

## Overview
`UUID` (Universal Unique Identifier) is a 16-byte [unique value](https://en.wikipedia.org/wiki/Universally_unique_identifier). You can use `UUID` as an identifier for
objects. `UUID` is indexable and you can use it as a
primary key.

> **NOTE:**
> In general, you can use `UUID` for any fields that function as a unique
identifier.
>

## Usage
To define a property as a `UUID`, set its type to the string `"uuid"` in
your object model. Create a Realm
object within a write transaction. To set any unique identifier properties of
your object to a random value, call `new UUID()`. Alternatively, pass a string
to `new UUID()` to set the unique identifier property to a specific value.

```javascript
const { UUID } = Realm.BSON;
const ProfileSchema = {
  name: "Profile",
  primaryKey: "_id",
  properties: {
    _id: "uuid",
    name: "string",
  },
};

const realm = await Realm.open({
  path: "realm-files/data-type-realm",
  schema: [ProfileSchema],
});

realm.write(() => {
  realm.create("Profile", {
    name: "John Doe.",
    _id: new UUID(), // create a _id with a randomly generated UUID
  });
  realm.create("Profile", {
    name: "Tim Doe.",
    _id: new UUID("882dd631-bc6e-4e0e-a9e8-f07b685fec8c"), // create a _id with a specific UUID value
  });
});

```
