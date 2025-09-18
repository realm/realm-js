# Model Data - React Native SDK
Every Realm object conforms to a specific **object type**. Object types are
classes you define that contain the properties and relationships
for objects of that type using a pre-defined schema.

Realm guarantees that all objects in a realm conform to the schema for their
object type and validates objects whenever they're created, modified, or deleted.

Realm objects are fundamentally similar to a common JavaScript object but they
also bring along a few additional features like schema validation and live
queries.

The React Native SDK memory maps Realm objects directly
to native JavaScript objects, which means there's no need to use a special data
access library, such as an [ORM](https://en.wikipedia.org/wiki/Object-relational_mapping).
Instead, you can work with Realm objects as you would any other object.

## Realm Schema
A **realm schema** is a list of valid object schemas that a realm may contain. Every Realm object must conform
to an object type that's included in its realm's schema.

If a realm already contains data when you open it, Realm
validates each object to ensure that an object schema was provided for its type
and that it meets all of the constraints specified in the schema.

Using `@realm/react`, you define a realm schema by passing individual object
schemas to `RealmProvider` or `createRealmContext()`.

```javascript
import Profile from './Models/Profile';
import {createRealmContext} from '@realm/react';

export const SyncedRealmContext = createRealmContext({
  // Pass all of your models into the schema value.
  schema: [Profile],
});

```

### Relationships
You can define relationships between objects in a realm. Realm models
relationships as object properties that point to other objects of a
given type in the realm. You define a relationship at the type level by
declaring a property in the type's schema where the value is another
object type.

Querying a relationship is just as performant as a regular property.
Relationships are direct references to other objects, so you don't need
to use joins and complex models to define and use them like you would in
a relational database. Instead, you can access related objects by
reading and writing to the relationship property directly.

There are three primary types of relationships between objects:

- One-to-One Relationship
- One-to-Many Relationship
- Inverse Relationship

> **NOTE:**
> Objects often contain direct references to other objects.
When working with objects and references,
you typically copy data from database storage into application memory.
This situation leaves the developer with a choice of what to copy
into memory:
>
> - You can copy all referenced objects into memory ahead of time.
This means that all referenced data is always available quickly
but can use up a lot of resources. If a system has limited memory,
this may not be viable.
> - You can copy just a foreign key value for each object. Later, you
can use the key to look up the full object when you need it.
These "lazy" lookups are more memory-efficient than copying all
referenced objects ahead of time. However, they require you to
maintain more query code and use runtime lookups that can slow
your app down.
>
> Realm's query architecture avoids the tradeoff between memory usage
and computational overhead. Instead, Realm queries can directly
reference related objects and
their properties on disk.
>
