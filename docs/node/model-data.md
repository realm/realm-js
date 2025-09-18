# Model Data - Node.js SDK
## Object Types & Schemas
Every Realm object conforms to a specific **object type**, which is essentially
a class that defines the properties and relationships for objects of that type using a pre-defined
schema. Realm guarantees that all objects in a realm conform to
the schema for their object type and validates objects whenever they're created,
modified, or deleted.

Realm objects are fundamentally similar to a common JavaScript object but they
also bring along a few additional features like schema validation and live
queries. The Node.js SDK memory maps Realm objects directly
to native JavaScript objects, which means there's no need to use a special data
access library, such as an [ORM](https://en.wikipedia.org/wiki/Object-relational_mapping).
Instead, you can work with Realm objects as you would any other object.

The following class contains a schema that defines a `Car` object type with
`id`, `make`, `model`, and `miles` properties. It also defines a primary key.

```javascript
class Car extends Realm.Object {
  static schema = {
    name: "Car",
    properties: {
      _id: { type: "objectId", default: () => new Realm.BSON.ObjectId() },
      make: "string",
      model: "string",
      miles: "int?",
    },
    primaryKey: "_id",
  };
}

```

## Realm Schema
A **realm schema** is a list of valid object schemas that a realm may contain. Every Realm object must conform
to an object type that's included in its realm's schema.

If a realm already contains data when you open it, Realm
validates each object to ensure that an object schema was provided for its type
and that it meets all of the constraints specified in the schema.

A realm that contains basic data about cars and manufacturers might use a
schema like the following:

```javascript
class Manufacturer extends Realm.Object {
  static schema = {
    name: "Manufacturer",
    properties: {
      _id: "objectId",
      // A manufacturer that may have many cars
      cars: "Car[]",
    },
  };
}

class Car extends Realm.Object {
  static schema = {
    name: "Car",
    properties: {
      _id: "objectId",
      make: "string",
      model: "string",
      miles: "int?",
    },
  };
}

```

## Relationships
Realm allows you to define explicit relationships between the types of
objects in an App. A relationship is an object property that references
another Realm object type. You can define
relationships by setting an object's property to another object type
in the property schema.

Relationships are direct references to other objects in a realm.
You don't need bridge tables or create joins to define a relationship like you
would in a relational database.
Instead you can access related objects by reading and writing to the property
that defines the relationship.

Realm executes read operations lazily as they come in.
Querying a relationship is just as performant as reading a regular property.

There are three primary types of relationships between objects:

- One-to-One Relationship
- One-to-Many Relationship
- Inverse Relationship

> **NOTE:**
> Objects often contain direct references to other objects.
When working with objects and references,
you often copy from database storage into application memory.
This situation leaves the developer with a choice of what to copy into memory:
>
> - You can copy the entire referenced object ahead of time.
This means that all referenced data is always available quickly,
but can use up a lot of resources. Depending on the amount of available memory
this may not be viable.
> - You can copy only a foreign key value for each object ahead of time that you
can use to query the full object if it's needed.
These referenced lookups are memory-efficient.
However, they require more query code and too many lookups can slow your application down.
>
> Realm's query architecture avoids the tradeoff between memory usage and computational overhead.
Instead, Realm queries can directly reference related objects and their properties on disk.
>
