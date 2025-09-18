# Embedded Objects - Node.js SDK
## Overview
An embedded object is a special type of Realm object
that models complex data about a specific object. Embedded objects are similar
to relationships, but they provide additional
constraints and map more naturally to the denormalized document
model.

Realm enforces unique ownership constraints that treat each embedded object as
nested data inside a single, specific parent object. An embedded object
inherits the lifecycle of its parent object and cannot exist as an independent
Realm object. This means that embedded objects cannot have a primary key and
that Realm automatically deletes embedded objects if their parent object is
deleted.

> **TIP:**
> You can use the same embedded object type in multiple parent object types, and
you can embed objects inside other embedded objects. You can even
recursively reference an embedded object type as an optional property in its
own definition.
>

> **NOTE:**
> When you delete a Realm object, Realm automatically deletes any
embedded objects referenced by that object. Any objects that your
application must persist after the deletion of their parent object
should use relationships
instead.
>

### Realm Object Models
To define an embedded object, set `embedded`
to `true`. You can reference an embedded object type from parent object types
in the same way as you would define a relationship:

> **IMPORTANT:**
> Embedded objects cannot have a primary key.
>

```javascript
const AddressSchema = {
  name: "Address",
  embedded: true, // default: false
  properties: {
    street: "string?",
    city: "string?",
    country: "string?",
    postalCode: "string?",
  },
};

const ContactSchema = {
  name: "Contact",
  primaryKey: "_id",
  properties: {
    _id: "objectId",
    name: "string",
    address: "Address", // Embed a single object
  },
};

const BusinessSchema = {
  name: "Business",
  primaryKey: "_id",
  properties: {
    _id: "objectId",
    name: "string",
    addresses: { type: "list", objectType: "Address" }, // Embed an array of objects
  },
};

```

### JSON Schema
Embedded objects map to embedded documents in the parent type's schema.

```json
{
  "title": "Contact",
  "bsonType": "object",
  "required": ["_id"],
  "properties": {
    "_id": { "bsonType": "objectId" },
    "name": { "bsonType": "string" },
    "address": {
      "title": "Address",
      "bsonType": "object",
      "properties": {
        "street": { "bsonType": "string" },
        "city": { "bsonType": "string" },
        "country": { "bsonType": "string" },
        "postalCode": { "bsonType": "string" }
      }
    }
  }
}
```

```json
{
  "title": "Business",
  "bsonType": "object",
  "required": ["_id", "name"],
  "properties": {
    "_id": { "bsonType": "objectId" },
    "name": { "bsonType": "string" },
    "addresses": {
      "bsonType": "array",
      "items": {
        "title": "Address",
        "bsonType": "object",
        "properties": {
          "street": { "bsonType": "string" },
          "city": { "bsonType": "string" },
          "country": { "bsonType": "string" },
          "postalCode": { "bsonType": "string" }
        }
      }
    }
  }
}
```

## Read and Write Embedded Objects
### Create an Embedded Object
To create an embedded object, assign an instance of the embedded object
to a parent object's property:

```javascript
//   create an embedded address object
const sydneyOrthodontics = {
  street: "42 Wallaby Way",
  city: "Sydney",
  country: "Australia",
  postalCode: "2774",
};
realm.write(() => {
  // create a contact object
  realm.create("Contact", {
    _id: new BSON.ObjectId(),
    name: "Philip Sherman",
    address: sydneyOrthodontics, // embed the address in the contact object
  });
});

```

### Update an Embedded Object Property
To update a property in an embedded object, modify the property in a
write transaction:

```javascript
// Find the contact with the address you want to update
const harryPotter = realm
  .objects("Contact")
  .filtered("name = 'Harry Potter'")[0];
// modify the property of the embedded object in a write transaction
realm.write(() => {
  // update the embedded object directly through the contact
  harryPotter.address.street = "1 Hogwarts Ave";
});

```

### Overwrite an Embedded Object
To overwrite an embedded object, reassign the embedded object property
of a party to a new instance in a write transaction:

```javascript
// create a new address
const harryNewAddress = {
  street: "12 Grimmauld Place",
  city: "London",
  country: "UK",
  postalCode: "E1 7AA",
};
realm.write(() => {
  // overwrite the embedded object with the new address within a write transaction
  harryPotter.address = harryNewAddress;
});

```

### Query a Collection on Embedded Object Properties
Use dot notation to filter or sort a collection of objects based on an embedded object
property value:

> **NOTE:**
> It is not possible to query embedded objects directly. Instead,
access embedded objects through a query for the parent object type.
>

```javascript
const philipShermanAddress = realm
  .objects("Contact")
  .filtered("name = 'Philip Sherman'")[0].address.street;
console.log(`Philip Sherman's address is ${philipShermanAddress}`);

```

### Delete an Embedded Object
Realm Uses Cascading Deletes for Embedded Objects. To delete an embedded object,
delete the embedded object's parent.

```javascript
realm.write(() => {
  // Deleting the contact will delete the embedded address of that contact
  realm.delete(
    realm.objects("Contact").filtered("name = 'Philip Sherman'")
  );
});

```
