# Counters - Node.js SDK
> Version added: 12.10.0

Realm SDK for Node.js offers a `Counter` class
the you can use as a logical counter when working with synchronized databases. Traditionally,
you would store a counter value and manually read, increment, and set it. However, if multiple clients
attempt to update the counter, it could result in an inaccurate underlying value across clients.

Consider a scenario where a Realm object has a `count` property of type `int`. Devices A
and B both read the value as `0`, then increment the count by adding `1` to the read value.
Instead of reflecting both devices' increments and converging to `2`, the underlying value is
only `1`.

The `Counter` class makes it possible to sync these updates so the value converges to
the same underlying value across all clients.

The SDK's `counter` is a presentation data type with an underlying type of `int`. This
means that no migration is required when changing an `int` type to a `counter`.

Counters cannot be used as:

- Mixed values
- Primary keys
- Elements in a collection

## Define a Counter Property
To use the `Counter` class, declare a property in your `Realm.Object`
as type `Counter`.

You can optionally declare this property as nullable by making it optional and passing both
`Counter` and `null` as types. With a nullable counter, you can set the counter property
within your Realm Object to `null` as needed.

The property is initialized by using either:

- Object notation `{ type: "int", presentation: "counter" }``{ type: "int", presentation: "counter", optional: true }`
- Shorthand `"counter"``"counter?"`

#### Javascript

```javascript
export class ClassWithCounter extends Realm.Object {
  static schema = {
    name: "ClassWithCounter",
    primaryKey: "_id",
    properties: {
      _id: { type: "objectId", default: () => new BSON.ObjectId() },
      myCounter: { type: "int", presentation: "counter" },
      // or myCounter: "counter"
      nullableCounter: { type: "int", presentation: "counter", optional: true },
      // or nullableCounter: "counter?"
    },
  };
}
```

#### Typescript

```typescript
export class ClassWithCounter extends Realm.Object<ClassWithCounter> {
  _id!: BSON.ObjectId;
  myCounter!: Counter;
  nullableCounter?: Counter | null;

  static schema: ObjectSchema = {
    name: "ClassWithCounter",
    primaryKey: "_id",
    properties: {
      _id: { type: "objectId", default: () => new BSON.ObjectId() },
      myCounter: { type: "int", presentation: "counter" },
      // or myCounter: "counter"
      nullableCounter: { type: "int", presentation: "counter", optional: true },
      // or nullableCounter: "counter?"
    },
  };
}
```

## Create and Update a Counter
To initialize a counter, create your object using the `realm.create()` method. Pass in your
Realm Object Schema and initial counter value, as
well as initial values for any other properties the object has.

```typescript
const siteVisitTracker = realm.write(() => {
  return realm.create(SiteVisitTracker, { siteVisits: 0 });
});
```

You can then use the following methods to modify the counter value:

- `increment()` and `decrement()` update the underlying value by a specified number.
- `set()` reassigns the counter to a specified value.

```typescript
siteVisitTracker.siteVisits.increment();
siteVisitTracker.siteVisits.value; // 1
siteVisitTracker.siteVisits.increment(2);
siteVisitTracker.siteVisits.value; // 3
siteVisitTracker.siteVisits.decrement(2);
siteVisitTracker.siteVisits.value; // 1
siteVisitTracker.siteVisits.increment(-2);
siteVisitTracker.siteVisits.value; // -1
siteVisitTracker.siteVisits.set(0); // reset counter value to 0
```

> **WARNING:**
> Use caution when using `set()`, as it overwrites any prior calls to `increment()` and
`decrement()`. Depending on the order of operations, this can result in the counter
converging on a different value. To avoid inaccurate counter values across clients, we
recommend that you avoid mixing `set()` with `increment()` and `decrement()`.
>

To update a nullable counter, either *to* or *from* a `null` value, you must use
`realm.create()` with an `UpdateMode`
specified. Instead of updating the underlying counter value, this sets the counter
property either to null or to a new counter.

`UpdateMode` updates any existing Counter object with a matching primary key, according to
the specified mode:

- `UpdateMode.All` updates all properties provided.
- `UpdateMode.Modified` updates only modified properties.

```typescript
const siteVisitTracker = realm.write(() => {
  return realm.create(SiteVisitTracker, {
    nullableSiteVisits: 0,
    siteVisits: 1,
  });
});

const myID = siteVisitTracker._id;

realm.write(() => {
  realm.create(
    SiteVisitTracker,
    { _id: myID, nullableSiteVisits: null },
    UpdateMode.Modified
  );
});

realm.write(() => {
  realm.create(
    SiteVisitTracker,
    { _id: myID, nullableSiteVisits: 0 },
    UpdateMode.Modified
  );
});
```

## Query Counter Values
You can query counter properties like other property types. However, to query by the
underlying counter value, you must pass the `counter.value` in a parameterized
query. In the following example, we want to find all objects with a
counter value greater than or equal to that of the specified counter.

```typescript
const belowThreshold = realm.write(() => {
  return realm.create(SiteVisitTracker, { siteVisits: 0 });
});

const atThreshold = realm.write(() => {
  return realm.create(SiteVisitTracker, { siteVisits: 1 });
});

const aboveThreshold = realm.write(() => {
  return realm.create(SiteVisitTracker, { siteVisits: 2 });
});

const allObjects = realm.objects("SiteVisitTracker");

let filteredObjects = allObjects.filtered(
  "siteVisits >= $0",
  atThreshold.siteVisits.value
);
```

For more information on querying with the SDK, refer to
[Realm Query Language](../../../realm-query-language.md).
