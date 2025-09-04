# Relationships & Embedded Objects - Node.js SDK
## To-One Relationship
A **to-one** relationship means that an object is related to no more than
one other object in an object schema.
To define a to-one relationship, specify the property type as the related
Realm object type.

> Example:
> An application could use the following object schemas to indicate
that a `Manufacturer` may make a single `Car`:
>
> #### Javascript
>
> ```javascript
> class Manufacturer extends Realm.Object {
>   static schema = {
>     name: "Manufacturer",
>     properties: {
>       _id: "objectId",
>       name: "string",
>       // A manufacturer that may have one car
>       car: "Car?",
>     },
>   };
> }
>
> class Car extends Realm.Object {
>   static schema = {
>     name: "Car",
>     properties: {
>       _id: "objectId",
>       model: "string",
>       miles: "int?",
>     },
>   };
> }
>
> ```
>
>
> #### Typescript
>
> ```javascript
> class Manufacturer extends Realm.Object {
>   _id!: BSON.ObjectId;
>   name!: string;
>   car?: Car;
>
>   static schema: ObjectSchema = {
>     name: "Manufacturer",
>     properties: {
>       _id: "objectId",
>       name: "string",
>       // A manufacturer that may have one car
>       car: "Car?",
>     },
>   };
> }
>
> class Car extends Realm.Object {
>   _id!: BSON.ObjectId;
>   model!: string;
>   miles?: number;
>
>   static schema: ObjectSchema = {
>     name: "Car",
>     properties: {
>       _id: "objectId",
>       model: "string",
>       miles: "int?",
>     },
>   };
> }
>
> ```
>
>

## To-Many Relationship
A **to-many** relationship means that an object is related in a specific
way to multiple objects.
To define a to-many relationship, specify a property where the type is a list
or array of the related Realm object type in its
object schema.

> Example:
> An application could use the following object schemas to indicate
that a `Manufacturer` may make many `Car` models:
>
> #### Javascript
>
> ```javascript
> class Manufacturer extends Realm.Object {
>   static schema = {
>     name: "Manufacturer",
>     properties: {
>       _id: "objectId",
>       name: "string",
>       // A manufacturer that may have many cars
>       cars: "Car[]",
>     },
>   };
> }
>
> class Car extends Realm.Object {
>   static schema = {
>     name: "Car",
>     properties: {
>       _id: "objectId",
>       model: "string",
>       miles: "int?",
>     },
>   };
> }
>
> ```
>
>
> #### Typescript
>
> ```javascript
> class Manufacturer extends Realm.Object {
>   _id!: BSON.ObjectId;
>   name!: string;
>   cars!: Realm.List<Car>;
>
>   static schema: ObjectSchema = {
>     name: "Manufacturer",
>     properties: {
>       _id: "objectId",
>       name: "string",
>       // A manufacturer that may have many cars
>       cars: "Car[]",
>     },
>   };
> }
>
> class Car extends Realm.Object {
>   _id!: BSON.ObjectId;
>   model!: string;
>   miles?: number;
>
>   static schema: ObjectSchema = {
>     name: "Car",
>     properties: {
>       _id: "objectId",
>       model: "string",
>       miles: "int?",
>     },
>   };
> }
>
> ```
>
>

## Inverse Relationship
An inverse relationship links an object back to any other objects that refer
to it in a defined to-one or to-many relationship.
Relationship definitions are unidirectional by default.
You must explicitly define a property in the object's model as an inverse relationship.

For example, the to-many relationship "Manufacturer has many Cars" does not automatically
create the inverse relationship "Car belongs to Manufacturer".
If you don't specify the inverse relationship in the object model,
you need to run a separate query to look up the manufacturer who makes a car.

To define an inverse relationship, define a `linkingObjects` property in your
object model. `linkingObjects` specifies the object type and
property name of the relationship that it inverts.

You cannot manually set the value of an inverse relationship property.
Realm automatically updates implicit relationships whenever
you add or remove a related object.

> Example:
> An application could use the following object schemas to indicate:
>
> 1. A `Manufacturer` may make many `Car` models.
> 2. Each `Car` should automatically link back to the `Manufacturer`
who makes it.
>
> The `Manufacturer` object's `cars` property is defined as a to-many
relationship with a `Realm.List` of
`Car` objects. It contains all of a given manufacturer's cars.
>
> The `Car` object's `manufacturer` property inverts this relationship.
The `manufacturer` property automatically updates to refer back to any
`Manufacturer` object that contains the `Car` in its `cars` property.
>
> #### Javascript
>
> ```javascript
> class Manufacturer extends Realm.Object {
>   static schema = {
>     name: "Manufacturer",
>     properties: {
>       _id: "objectId",
>       name: "string",
>       // A manufacturer that may have many cars
>       cars: "Car[]",
>     },
>   };
> }
>
> class Car extends Realm.Object {
>   static schema = {
>     name: "Car",
>     properties: {
>       _id: "objectId",
>       model: "string",
>       miles: "int?",
>       manufacturer: {
>         type: "linkingObjects",
>         objectType: "Manufacturer",
>         property: "cars",
>       },
>     },
>   };
> }
>
> ```
>
>
> #### Typescript
>
> ```javascript
> class Manufacturer extends Realm.Object {
>   _id!: BSON.ObjectId;
>   name!: string;
>   cars!: Realm.List<Car>;
>
>   static schema: ObjectSchema = {
>     name: "Manufacturer",
>     properties: {
>       _id: "objectId",
>       name: "string",
>       // A manufacturer that may have many cars
>       cars: "Car[]",
>     },
>   };
> }
>
> class Car extends Realm.Object {
>   _id!: BSON.ObjectId;
>   model!: string;
>   miles?: number;
>   manufacturer!: Realm.Collection<Manufacturer>;
>
>   static schema: ObjectSchema = {
>     name: "Car",
>     properties: {
>       _id: "objectId",
>       model: "string",
>       miles: "int?",
>       manufacturer: {
>         type: "linkingObjects",
>         objectType: "Manufacturer",
>         property: "cars",
>       },
>     },
>   };
> }
>
> ```
>
>

### Dynamically Obtain an Inversely Linked Object
You can dynamically retrieve an object with an inverse relationship without
defining a `linkingObjects` type in its schema. Remove the
`linkingObjects` type from your schema, so your schemas look like a standard
**to-many** relationship. When you need to retrieve the linked object, call the
`Realm.Object.linkingObjects()`
query.

> Example:
> In the following continuation from the inverse relationship example, we
have removed the `manufacturer` field with type 'linkingObjects' from
the `Car` schema. An application developer creates several manufacturers
and car objects, and the application pushes the newly-created cars into a
manufacturer's `cars` field.
>
> To find the manufacturer who makes a specific car object, call `.linkingObjects()`
and pass the "Manufacturer" class name and "cars" field as parameters.
>
> The `.linkingObjects()` method returns a Results collection of objects whose property inverts the relationship.
In this example, only one manufacturer makes the Sentra car model, so we
can expect that manufacturer to be named Nissan.
>
> #### Javascript
>
> ```javascript
> const carObjects = realm.objects(Car);
> // Get the Manufacturer who makes the Car
> const linkedManufacturer = carObjects[0].linkingObjects(
>   "Manufacturer",
>   "cars"
> )[0];
> expect(linkedManufacturer.name).toBe("Nissan");
>
> ```
>
>
> #### Typescript
>
> ```javascript
> const carObjects = realm.objects<Car>(Car);
> // Get the Manufacturer who makes the Car
> const linkedManufacturer: Manufacturer =
>   carObjects[0].linkingObjects<Manufacturer>("Manufacturer", "cars")[0];
> expect(linkedManufacturer.name).toBe("Nissan");
>
> ```
>
>

## Embedded Objects
An embedded object is a special type of Realm object
that models complex data.
They also map more naturally to the document model.
Embedded objects are similar to relationships,
but provide additional constraints.

Realm treats each embedded object as nested data inside of a parent object.
An embedded object inherits the lifecycle of its parent object.
It cannot exist as an independent Realm object.
This means that embedded objects cannot have a primary key.
Realm also automatically deletes embedded objects if their parent object is deleted.

> **TIP:**
> You can use the same embedded object type in multiple parent object types.
You can also embed objects inside of other embedded objects.
You can even recursively reference an embedded object type as
an optional property in its own definition.
>

### Realm Object Models
To specify that a Realm object model defines an embedded object, set `embedded`
to `true`. Reference an embedded object type from parent object types
as you would define a relationship:

#### Javascript

```javascript
class Manufacturer extends Realm.Object {
  static schema = {
    name: "Manufacturer",
    properties: {
      _id: "objectId",
      name: "string",
      cars: "Car[]",
      // Embed an array of objects
      warranties: "Warranty[]",
    },
  };
}

class Car extends Realm.Object {
  static schema = {
    name: "Car",
    properties: {
      _id: "objectId",
      model: "string",
      miles: "int?",
      // Embed one object
      warranty: "Warranty?",
    },
  };
}

class Warranty extends Realm.Object {
  static schema = {
    name: "Warranty",
    embedded: true,
    properties: {
      name: "string",
      termLength: "int",
      cost: "int",
    },
  };
}

```

#### Typescript

```javascript
class Manufacturer extends Realm.Object {
  _id!: BSON.ObjectId;
  name!: string;
  cars!: Realm.List<Car>;
  warranties!: Realm.List<Warranty>;

  static schema: ObjectSchema = {
    name: "Manufacturer",
    properties: {
      _id: "objectId",
      name: "string",
      cars: "Car[]",
      // Embed an array of objects
      warranties: "Warranty[]",
    },
  };
}

class Car extends Realm.Object {
  _id!: BSON.ObjectId;
  model!: string;
  miles?: number;
  warranty?: Warranty;

  static schema: ObjectSchema = {
    name: "Car",
    properties: {
      _id: "objectId",
      model: "string",
      miles: "int?",
      // Embed one object
      warranty: "Warranty?",
    },
  };
}

class Warranty extends Realm.Object {
  name!: string;
  termLength!: number;
  cost!: number;

  static schema: ObjectSchema = {
    name: "Warranty",
    embedded: true,
    properties: {
      name: "string",
      termLength: "int",
      cost: "int",
    },
  };
}

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
