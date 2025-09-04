# Define a Realm Object Model - React Native SDK
## Define an Object Type
To define a Realm object type, create a class that extends `Realm.Object`.
Define the type's `name` and `properties` in a static property called `schema`.
The type's name must be unique among object types in a realm.

#### Javascript

```javascript
class Book extends Realm.Object {
  static schema = {
    name: 'Book',
    properties: {
      name: {type: 'string', indexed: true},
      price: 'int?',
    },
  };
}

```

#### Typescript

```javascript
class Book extends Realm.Object<Book> {
  name!: string;
  price?: number;

  static schema: ObjectSchema = {
    name: 'Book',
    properties: {
      name: {type: 'string', indexed: true},
      price: 'int?',
    },
  };
}

```

Then you can pass the class itself to the schema property of the
`Configuration` object
when opening a realm.

## Supported Property Types
Every property in a Realm object has a strongly defined data type. A
property's type can be a primitive data type or an object type defined in the
same realm. The type also specifies whether the property contains a single
value or a list of values.

To specify that a field contains a list of a primitive value type, append `[]`
to the type name.

For a list of supported property types, see Property Types

## Define Object Properties
To define a property for an object type, create a key-value pair representing
the name and data type of the property under the `properties` field.

The following schema defines a `Car` type that has these properties: `_id`
`make`, `model`, and `miles`.

### Declare an Optional Property
To mark a property as optional, use object syntax and set `optional` to
`true`. You can also use a simplified syntax: append a question mark `?`
to the type. This is best-suited to basic types. You should use the more
specific object syntax for more complicated types.

In the following example of a `Person` class, the `age` and `birthday`
properties are both optional.

```typescript
class Person extends Realm.Object<Person> {
  name!: string;
  age?: number;
  birthday?: Date;

  static schema: ObjectSchema = {
    name: 'Person',
    properties: {
      name: 'string',
      age: {
        type: 'int',
        optional: true,
      },
      // You can use a simplified syntax instead. For
      // more complicated types, use the object syntax.
      birthday: 'date?',
    },
  };
}
```

### Declare a Primary Key
To specify a property as an object type's primary key, set the schema's
`primaryKey` field to the property name.

> **NOTE:**
> A **primary key** is a property that uniquely identifies an
object. Realm automatically indexes
primary key properties, which allows you to read and modify objects based
on their primary key efficiently.
>
> If an object type has a primary key, then all objects of that type must
include the primary key property with a unique value among objects of
the same type in a realm. An object type can have only one primary
key. You cannot change the primary key property for an object type after any
object of that type is added to a realm, and you cannot modify an object's
primary key value.
>

In the following example of a `Task` class, we specify the `_id` property as
the primary key.

#### Javascript

```javascript
class Task extends Realm.Object {
  static schema = {
    name: 'Task',
    properties: {
      _id: 'int',
      name: 'string',
      priority: 'int?',
      progressMinutes: 'int?',
      assignee: 'Person?',
    },
    primaryKey: '_id',
  };
}

```

#### Typescript

```typescript
class Task extends Realm.Object<Task> {
  _id!: number;
  name!: string;
  priority?: number;
  progressMinutes?: number;
  assignee?: Person;
  age?: number;

  static schema: ObjectSchema = {
    name: 'Task',
    properties: {
      _id: 'int',
      name: 'string',
      priority: 'int?',
      progressMinutes: 'int',
      assignee: 'Person?',
    },
    primaryKey: '_id',
  };
}

```

### Index a Property
If you frequently run read operations
based on a specific property, you can index the property to optimize
performance. Realm supports indexing for string, integer, boolean, `Date`,
`UUID`, and `ObjectId` properties.

> **NOTE:**
> An **index** significantly increases the speed of certain read operations at
the cost of slightly slower write times and additional storage and memory
overhead. Realm stores indexes on disk, which makes your realm files
larger. Each index entry is a minimum of 12 bytes. The ordering of the index
entries supports efficient equality matches and range-based query operations.
>

To index a given property, set the property's `indexed` field to `true`.

In the following example of a `Book` class, we define an index on the `name`
property.

#### Javascript

```javascript
class Book extends Realm.Object {
  static schema = {
    name: 'Book',
    properties: {
      name: {type: 'string', indexed: true},
      price: 'int?',
    },
  };
}

```

#### Typescript

```typescript
class Book extends Realm.Object<Book> {
  name!: string;
  price?: number;

  static schema: ObjectSchema = {
    name: 'Book',
    properties: {
      name: {type: 'string', indexed: true},
      price: 'int?',
    },
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
    name: 'Book',
    properties: {
      name: {type: 'string', indexed: 'full-text'},
      price: 'int?',
    },
  };
}
```

### Set a Default Property Value
To define a default value, set the value of the property to an object with a
`type` field and a `default` field.

In the following example of a `Car` class, we define a `miles` property with
a default value of `0`.

> Version added: 11.1.0

In Realm.js v11.1.0 and later, you can use a function to define a dynamic
default value, like the `timestamp` property in the example below.

#### Javascript

```javascript
class Car extends Realm.Object {
  static schema = {
    name: 'Car',
    properties: {
      make: 'string',
      model: 'string',
      miles: {type: 'int', default: 0},
      timestamp: {
        type: 'int',
        default: () => Math.round(new Date().getTime() / 1000),
      },
    },
  };
}

```

#### Typescript

```typescript
class Car extends Realm.Object {
  make!: string;
  model!: string;
  miles: number = 0;
  timestamp: number = Math.round(new Date().getTime() / 1000);

  static schema: ObjectSchema = {
    name: 'Car',
    properties: {
      make: 'string',
      model: 'string',
      miles: {type: 'int', default: 0},
      timestamp: {
        type: 'int',
        default: () => Math.round(new Date().getTime() / 1000),
      },
    },
  };
}

```

### Remap a Property
To use a different property name in your code than is stored in
Realm, set `mapTo` to the name of the property as it appears in
your code.

In the following example of an `Employee` class, we remap the `first_name`
property to `firstName`.

#### Javascript

```javascript
class Employee extends Realm.Object {
  static schema = {
    name: 'Employee',
    properties: {
      _id: 'string',
      first_name: {type: 'string', mapTo: 'firstName'},
    },
    primaryKey: '_id',
  };
}

```

#### Typescript

```typescript
class Employee extends Realm.Object {
  _id!: string;
  first_name!: string;

  static schema: ObjectSchema = {
    name: 'Employee',
    properties: {
      _id: 'string',
      first_name: {type: 'string', mapTo: 'firstName'},
    },
    primaryKey: '_id',
  };
}

```

## Define Unstructured Data
> Version added:

Starting in JS SDK version 12.9.0, you can store collections of mixed data
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
your schema as mixed types. You can then
set these `mixed` properties as a list or a
dictionary collection of mixed
elements. Note that a `mixed` property *cannot* hold a set or an embedded
object.

> **TIP:**
> - Use a map of mixed data types when the type is unknown but each value will have a unique identifier.
> - Use a list of mixed data types when the type is unknown but the order of objects is meaningful.
>

## TypeScript and Required Properties
We recommend creating Realm objects
with `Realm.create()`, but you
can also use the `new` operator for your object model's class.

If you use `new`, you must add your class as a generic, along with any
required properties, when extending `Realm.Object`. This enables full
TypeScript support for your object model, including type errors when required
fields are not defined.

```javascript
class Book extends Realm.Object<Book, 'name' | 'store'> {
  name!: string;
  store!: string;
  price?: number;

  static schema: ObjectSchema = {
    name: 'Book',
    properties: {
      name: {type: 'string', indexed: true},
      store: 'string',
      price: 'int?',
    },
  };
}

```
