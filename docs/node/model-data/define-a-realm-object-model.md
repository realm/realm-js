# Define a Realm Object Model - Node.js SDK
## Define a Realm Object Type
To define a Realm object type, create a schema object that specifies the type's
`name` and `properties`. The type name must be unique among object types in
a realm. For details on how to define specific properties, see Define
Object Properties.

You can define your schemas with JavaScript classes (like most of the examples on
this page), but you can also define them as JavaScript objects.

```javascript
const Car = {
  name: "Car",
  properties: {
    _id: "objectId",
    make: "string",
    model: "string",
    miles: "int?",
  },
};

```

## Define Realm Object Types with JavaScript Classes
You can define Realm object types with JavaScript classes. To use a class as an
object type, define the object schema on the static property `schema`.

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

> **NOTE:**
> Class names are limited to a maximum of 57 UTF-8 characters.
>

Pass the class itself to the schema property of the `Realm.Configuration` object when opening a realm. You can then
read and write data normally.

```javascript
const realm = await Realm.open({
  path: "myrealm",
  schema: [Car],
});

let car1;

realm.write(() => {
  car1 = realm.create(Car, {
    make: "Nissan",
    model: "Sentra",
    miles: 1000,
  });
});

```

## Supported Property Types
Every property in a Realm object has a strongly defined data type. A
property's type can be a primitive data type or an object type defined in the
same realm. The type also specifies whether the property contains a single
value or a list of values.

Realm supports the following primitive data types:

- `bool` for boolean values
- `int` and `double`, which map to JavaScript `number` values
- `Decimal128` for high precision numbers
- `string`
- `date`, which maps to [Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date)
- `data`, which maps to [ArrayBuffer](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer)
- `objectId`, which maps to [ObjectId](https://www.mongodb.com/docs/manual/reference/method/ObjectId/)

To specify that a field contains a list of a primitive value type, append `[]`
to the type name.

## Define Object Properties
To define a property for an object type, create a key-value pair representing
the name and data type of the property under the `properties` field.

The following schema defines a `Car` type that has these properties: `_id`
`make`, `model`, and `miles`.

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

### Specify an Optional Property
To mark a property as optional, append a question mark `?` to its type.

The following `Car` schema defines an optional `miles` property of type `int`.

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

### Specify a Primary Key
To specify a property as an object type's primary key, set the schema's
`primaryKey` field to the property name.

> **NOTE:**
> A **primary key** is a property that uniquely identifies an
object. Realm automatically indexes
primary key properties, which allows you to efficiently read and modify
objects based on their primary key.
>
> If an object type has a primary key, then all objects of that type must
include the primary key property with a value that is unique among objects of
the same type in a realm. An object type may have at most one primary
key. You cannot change the primary key property for an object type after any
object of that type is added to a realm and you cannot modify an object's
primary key value.
>

The following `Car` object schema specifies the `_id` property as its
primary key.

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

### Index a Property
Realm supports indexing for string, integer, boolean, `Date`, `UUID`, and `ObjectId`
properties. To define an index for a given property, set `indexed` to
`true`.

> **NOTE:**
> An **index** significantly increases the speed of certain read operations at
the cost of slightly slower write times and additional storage and memory
overhead. Realm stores indexes on disk, which makes your realm files
larger. Each index entry is a minimum of 12 bytes. The ordering of the index
entries supports efficient equality matches and range-based query operations.
>
> It's best to only add indexes when optimizing the read performance for
specific situations.
>

The following `Car` object schema defines an index on the `_id`
property.

```javascript
class Car extends Realm.Object {
  static schema = {
    name: "Car",
    properties: {
      _id: { type: "objectId", indexed: true },
      make: "string",
      model_name: { type: "string", mapTo: "modelName" },
      miles: { type: "int", default: 0 },
    },
    primaryKey: "_id",
  };
}

```

### Set a Full-Text Search Index
In addition to standard indexes, Realm also supports Full-Text Search (FTS)
indexes on string properties. While you can query a string field with or without
a standard index, an FTS index enables searching for multiple words and phrases
and excluding others.

For more information on querying FTS indexes, see Filter with Full-Text Search.

To create an FTS index, set the `indexed`
type to `'full-text'`. This enables full-text queries on the property. In the
following example, we set the indexed type for the `name` property to `'full-text'`:

```typescript
class Book extends Realm.Object<Book> {
  name!: string;
  price?: number;

  static schema: ObjectSchema = {
    name: "Book",
    properties: {
      name: { type: "string", indexed: "full-text" },
      price: "int?",
    },
  };
}

```

### Define a Default Property Value
To define a default value, set the value of the property to an object with a
`type` field and a `default` field.

The following `Car` object schema specifies a default value of `0` for
the `miles` property:

```javascript
class Car extends Realm.Object {
  static schema = {
    name: "Car",
    properties: {
      _id: { type: "objectId", indexed: true },
      make: "string",
      model_name: { type: "string", mapTo: "modelName" },
      miles: { type: "int", default: 0 },
    },
    primaryKey: "_id",
  };
}

```

### Map a Property or Class to a Different Name
By default, Realm uses the name defined in the model class to represent
classes and fields internally. In some cases, you might want to change
this behavior. For example:

- To make it easier to work across platforms where naming conventions
differ.
- To change a class or field name without forcing a migration.
- To support multiple model classes with the same name in different packages.
- To use a class name that is longer than the 57-character limit enforced
by Realm.

You can map a class or property name in your code to a different name to
store in a realm.

Note that migrations must use the persisted class or property name, and
any schema errors reported also use the persisted name.

#### Remap Class

To use a different class name in your code than is stored in a realm:

1. Set the `name` property of your Realm object's **schema** to the name
that you want to use to store the object.
2. Use the **class** name in the Realm configuration's `schema` property
when you open the realm.
3. Use the mapped name for performing CRUD operations.

In the following example, Realm stores objects created with the
`Task` class as `Todo_Item`.

#### Javascript

```javascript
class Task extends Realm.Object {
  static schema = {
    // Set the schema's `name` property to the name you want to store.
    // Here, we store items as `Todo_Item` instead of the class's `Task` name.
    name: "Todo_Item",
    properties: {
      _id: "int",
      name: "string",
      owner_id: "string?",
    },
    primaryKey: "_id",
  };
}

// ...

realm.write(() => {
  // Use the mapped name when performing CRUD operations.
  realm.create(`Todo_Item`, {
    _id: 12342245,
    owner_id: anonymousUser.id,
    name: "Test the Todo_Item object name",
  });
});

// Use the mapped name when performing CRUD operations.
const assignedTasks = realm.objects(`Todo_Item`);

```

#### Typescript

```typescript
class Task extends Realm.Object<Task> {
  _id!: number;
  name!: string;
  owner_id?: string;

  static schema: ObjectSchema = {
    // Set the schema's `name` property to the name you want to store.
    // Here, we store items as `Todo_Item` instead of the class's `Task` name.
    name: "Todo_Item",
    properties: {
      _id: "int",
      name: "string",
      owner_id: "string?",
    },
    primaryKey: "_id",
  };
}
// ...
realm.write(() => {
  // Use the mapped name when performing CRUD operations.
  realm.create(`Todo_Item`, {
    _id: 12342245,
    owner_id: anonymousUser.id,
    name: "Test the Todo_Item object name",
  });
});

// Use the mapped name when performing CRUD operations.
const assignedTasks = realm.objects(`Todo_Item`);

```

#### Remap Property

To use a different property name in your code than is stored in
a realm, set `mapTo` to the name of the property as it appears in
your code.

In the following `Car` object schema, Realm stores the car's
model name with the snake case `model_name` property. The schema maps the property
to `modelName` for objects used in client code.

```javascript
class Car extends Realm.Object {
  static schema = {
    name: "Car",
    properties: {
      _id: { type: "objectId", indexed: true },
      make: "string",
      model_name: { type: "string", mapTo: "modelName" },
      miles: { type: "int", default: 0 },
    },
    primaryKey: "_id",
  };
}

```

## Define Relationship Properties

### Define a To-One Relationship Property
A **to-one** relationship maps one property to a single instance of
another object type. For example, you can model a manufacturer having at most
one car as a to-one relationship.

To define a to-one relationship property, specify the related object type name
as the property type.

> **IMPORTANT:**
> When you declare a to-one relationship in your object model, it must
be an optional property. If you try to make a to-one relationship
required, Realm throws an exception at runtime.
>

The following `Manufacturer` object schema specifies that a manufacturer may or may not
make a single `Car`. If they do make a `Car`, Realm links to it through the
`car` property:

```javascript
class Manufacturer extends Realm.Object {
  static schema = {
    name: "Manufacturer",
    properties: {
      _id: "objectId",
      // A manufacturer that may have one car
      car: "Car?",
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

### Define a To-Many Relationship Property
A **to-many** relationship maps one property to zero or more instances
of another object type. For example, you can model a manufacturer having any
number of cars as a to-many relationship.

To define a to-many relationship property, specify the related object type name
as a list.

An application could use the following object schemas to indicate that a `Manufacturer`
may make multiple `Car` objects by including them in its `cars` property:

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

### Define an Inverse Relationship Property
An **inverse relationship** property is an automatic backlink relationship.
Realm automatically updates implicit relationships whenever an
object is added or removed in a corresponding to-many list. You cannot manually
set the value of an inverse relationship property.

To define an inverse relationship property, set the property type to
`linkingObjects` and specify the object type and property name that define the
relationship to invert.

An application could use the following object schemas to indicate that a `Manufacturer`
may make many `Car` objects and that each `Car` should automatically keep track
of which `Manufacturer` makes it.

- with `Car` objects and contains all of a given manufacturer's cars.
- automatically updates to refer back to any `Manufacturer` object that contains the
car in its `cars` property.

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
      // Backlink to the manufacturer. This is automatically updated whenever
      // this car is added to or removed from a manufacturer's cars list.
      assignee: {
        type: "linkingObjects",
        objectType: "Manufacturer",
        property: "cars",
      },
    },
  };
}

```

### Define an Embedded Object Property
To define a Realm object model with an embedded object (nested Realm
object), set `embedded` to `true`.

An **embedded object** exists as nested data inside of a single, specific
parent object. It inherits the lifecycle of its parent object and cannot
exist as an independent Realm object. Realm automatically deletes embedded
objects if their parent object is deleted or when overwritten by a new
embedded object instance. Embedded objects cannot have a primary key.

You can reference an embedded object type from parent object types in the
same way as a relationship.

The following example requires two parent schemas, `Manufacturer` and
`Car`. The application requires an embedded child schema `Warranty`.
A `Manufacturer` object can embed a list of `Warranty` objects, whereas a
`Car` object can only embed a single `Warranty` object.

```javascript
class Manufacturer extends Realm.Object {
  static schema = {
    name: "Manufacturer",
    properties: {
      _id: "objectId",
      name: "string",
      // Embed an array of objects
      warranties: { type: "list", objectType: "Warranty" },
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
      // Embed one object
      warranty: "Warranty",
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

## Define Unstructured Data
> Version added: 12.9.0

Starting in Node.js SDK version 12.9.0, you can store
collections
of mixed data
within a `mixed` property. You can use this feature to model complex data
structures, such as JSON, without having to define a
strict data model.

**Unstructured data** is data that doesn't easily conform to an expected
schema, making it difficult or impractical to model to individual
data classes. For example, your app might have highly variable data or dynamic
data whose structure is unknown at runtime.

Storing collections in a mixed property offers flexibility without sacrificing
functionality. And
you can work with them the same way you would a non-mixed
collection:

- You can nest mixed collections up to 100 levels.
- You can query on and react to changes on mixed collections.
- You can find and update individual mixed collection elements.

However, storing data in mixed collections is less performant than using a structured
schema or serializing JSON blobs into a single string property.

To model unstructured data in your app, define the appropriate properties in
your schema as mixed types. You can then set these
`mixed` properties as a list or a
dictionary collection of mixed elements.
Note that `mixed` *cannot* represent a set or an embedded object.

> **TIP:**
> - Use a map of mixed data types when the type is unknown but each value will have a unique identifier.
> - Use a list of mixed data types when the type is unknown but the order of objects is meaningful.
>
