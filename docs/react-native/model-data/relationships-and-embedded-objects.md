# Relationships & Embedded Objects - React Native SDK
## One-to-One Relationship
A **one-to-one** relationship means an object is related to at most one
other object of a particular type. To define a one-to-one relationship,
specify the property type as the related Realm object type.

> Example:
> In this example, a `Manufacturer` may make a single `Car`:
>
> ```typescript
> class ToOneManufacturer extends Realm.Object {
>   _id!: BSON.ObjectId;
>   name!: string;
>   car?: Car;
>
>   static schema: Realm.ObjectSchema = {
>     name: 'ToOneManufacturer',
>     properties: {
>       _id: 'objectId',
>       name: 'string',
>       // A manufacturer that may have one Car object
>       car: 'Car?',
>     },
>   };
> }
>
> class Car extends Realm.Object {
>   _id!: BSON.ObjectId;
>   model!: string;
>   miles?: number;
>
>   static schema: Realm.ObjectSchema = {
>     name: 'Car',
>     properties: {
>       _id: 'objectId',
>       model: 'string',
>       miles: 'int?',
>     },
>   };
> }
> ```
>

## One-to-Many Relationship
A **one-to-many** relationship means an object may be related to
multiple objects. To define a to-many relationship, specify a property where the
type is a list or array of the related Realm object type in its object
schema.

> Example:
> In this example, a `Manufacturer` may make many `Car` models:
>
> ```typescript
> class ToManyManufacturer extends Realm.Object {
>   _id!: BSON.ObjectId;
>   name!: string;
>   cars!: Realm.List<LinkedCar>;
>
>   static schema: Realm.ObjectSchema = {
>     name: 'ToManyManufacturer',
>     properties: {
>       _id: 'objectId',
>       name: 'string',
>       // A manufacturer's related LinkedCar objects
>       cars: 'LinkedCar[]',
>     },
>   };
> }
>
> class LinkedCar extends Realm.Object {
>   _id!: BSON.ObjectId;
>   model!: string;
>   miles?: number;
>
>   static schema: Realm.ObjectSchema = {
>     name: 'LinkedCar',
>     properties: {
>       _id: 'objectId',
>       model: 'string',
>       miles: 'int?',
>       // A car's related ToManyManufacturer objects
>       manufacturer: {
>         type: 'linkingObjects',
>         objectType: 'ToManyManufacturer',
>         property: 'cars',
>       },
>     },
>   };
> }
> ```
>

## Inverse Relationship
An inverse relationship links an object back to any other objects that refer
to it in a defined to-one or to-many relationship.
Relationship definitions are unidirectional by default.
You must explicitly define a property in the object's model as an inverse
relationship.

For example, the to-many relationship "Manufacturer has many Cars" does not
automatically create the inverse relationship "Car belongs to Manufacturer".
If you don't specify the inverse relationship in the object model,
you need to run a separate query to look up the manufacturer who makes a car.

### Define Inverse Relationship Properties
You can assign an inverse relationship to a property in the object
schema using `linkingObjects`. This lets you access the inverse relationship
like a normal property.

A `linkingObjects` property backlinks to a specific relationship. You
specify which relationship to backlink with the object type and property
name of the relationship.

> Example:
> In this example, the `ManufacturerInverse` object's `cars` property has a
to-many  relationship with a `Realm.List` of
`CarInverse` objects. It contains all of the cars that are linked to the
manufacturer.
>
> The `CarInverse` object's `manufacturer` property inverts this
relationship. The `manufacturer` property automatically updates to refer
back to any `ManufacturerInverse` object that contains the car object in
its `cars` property.
>
> ```typescript
> class ManufacturerInverse extends Realm.Object {
>   _id!: BSON.ObjectId;
>   name!: string;
>   cars!: Realm.List<CarInverse>;
>
>   static schema: Realm.ObjectSchema = {
>     name: 'ManufacturerInverse',
>     properties: {
>       _id: 'objectId',
>       name: 'string',
>       // A manufacturer's related CarInverse objects
>       cars: 'CarInverse[]',
>     },
>   };
> }
>
> class CarInverse extends Realm.Object {
>   _id!: BSON.ObjectId;
>   model!: string;
>   manufacturer!: Realm.List<ManufacturerInverse>;
>   miles?: number;
>
>   static schema: Realm.ObjectSchema = {
>     name: 'CarInverse',
>     properties: {
>       _id: 'objectId',
>       model: 'string',
>       miles: 'int?',
>       // A car's related ManufacturerInverse objects
>       manufacturer: {
>         type: 'linkingObjects',
>         objectType: 'ManufacturerInverse',
>         property: 'cars',
>       },
>     },
>   };
> }
> ```
>

### Find Linking Objects In Code
You can find all objects that link to a given object by calling the
object's `Realm.Object.linkingObjects()` method. This is useful for when you
want to access all linking objects for a particular relationship without
adding a property to the object schema.

> Example:
> In this example, we have a `LinkedCar` object model that does not
have a `manufacturer` field with type 'linkingObjects'. Someone creates
several manufacturers and car objects, adding the newly-created cars into a
manufacturer's `cars` field.
>
> We can find a car's manufacturer using the `linkingObjects()` method. This
method returns a Results collection of
objects that link to the car. In this example, only one manufacturer makes
the Sentra car model, so we can expect that manufacturer to be named Nissan.
>
> To find the manufacturer that makes a specific car:
>
> 1. Call `linkingObjects()`
> 2. Pass the manufacturer class name and "cars" field as parameters
>
> ```typescript
> const getLinkedManufacturer = (car: LinkedCar): string => {
>   const manufacturer = car.linkingObjects<ToManyManufacturer>(
>     'ToManyManufacturer',
>     'cars',
>   )[0];
>
>   // Returns 'Nissan', as only one manufacturer is linked
>   // to this car object.
>   return manufacturer.name;
> };
> ```
>

## Embedded Objects
An embedded object is a special type of Realm object
that models complex data about a specific object. Embedded objects are similar
to relationships, but they provide additional
constraints and map more naturally to the denormalized document
model.

Realm enforces unique ownership constraints that treat each embedded object as
nested data inside a single, specific parent object. An embedded object
inherits the lifecycle of its parent object and can't exist as an independent
Realm object. This means that embedded objects can't have a primary key and
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
To define an embedded object, set `embedded` to `true`. You can reference
an embedded object type from parent object types in the same way you define a
relationship:

```typescript
class Manufacturer extends Realm.Object {
  _id!: BSON.ObjectId;
  name!: string;
  cars!: Realm.List<CarWithEmbed>;
  warranties!: Realm.List<Warranty>;

  static schema: Realm.ObjectSchema = {
    name: 'Manufacturer',
    properties: {
      _id: 'objectId',
      name: 'string',
      cars: 'CarWithEmbed[]',
      // Embed an array of objects
      warranties: 'Warranty[]',
    },
  };
}

class CarWithEmbed extends Realm.Object {
  _id!: BSON.ObjectId;
  model!: string;
  miles?: number;
  warranty?: Warranty;

  static schema: Realm.ObjectSchema = {
    name: 'CarWithEmbed',
    properties: {
      _id: 'objectId',
      model: 'string',
      miles: 'int?',
      // Embed one object
      warranty: 'Warranty?',
    },
  };
}

class Warranty extends Realm.Object {
  name!: string;
  termLength!: number;
  cost!: number;

  static schema: Realm.ObjectSchema = {
    name: 'Warranty',
    embedded: true,
    properties: {
      name: 'string',
      termLength: 'int',
      cost: 'int',
    },
  };
}
```

> **IMPORTANT:**
> Embedded objects can't have a primary key.
>
