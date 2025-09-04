# Quick Start - Node.js SDK
This page contains information to quickly get Realm
integrated into your app.

If you haven't already, install the Realm Node.js SDK.

## Import Realm
At the top of your source files where you want to use Realm, add
the following line to import the SDK and the BSON library.

```typescript
import Realm, { BSON } from "realm";
```

## Define Your Object Model
Your application's object model defines the data
that you can store within Realm.

To define a Realm object type, create a schema object that specifies the type's
`name` and `properties`. The type name must be unique among object types in
a realm. For details on how to define specific properties, see Define
Object Properties.

The following code shows how to define an object model for a `Task` object. In this example:

- The `primaryKey` is the `_id` of type `int`. Another common type used for
primary keys is ObjectId.
- The `name` field is required.
- The `status` and `owner_id` fields are optional, denoted by the question
mark immediately after the data type.

#### Javascript

```javascript
export class QuickstartTask extends Realm.Object {
  static schema = {
    name: "Task",
    properties: {
      _id: "objectId",
      name: "string",
      status: "string?",
      owner_id: "string?",
    },
    primaryKey: "_id",
  };
}
```

#### Typescript

```typescript
export class QuickstartTask extends Realm.Object<Task> {
  _id!: BSON.ObjectID;
  name!: string;
  status?: string;
  owner_id?: string;

  static schema: ObjectSchema = {
    name: "Task",
    properties: {
      _id: "objectId",
      name: "string",
      status: "string?",
      owner_id: "string?",
    },
    primaryKey: "_id",
  };
}
```

## Open a Realm
To open a realm, pass a `Realm.BaseConfiguration` object to `Realm.open()`.

```typescript
const realm = await Realm.open({
  schema: [QuickstartTask],
});
```

## Find, Sort, and Filter Objects
The following code demonstrates how to:

- Query for all instances of the "Task" object type.
- Filter the query to retrieve only the tasks that are "Open".
- Sort the tasks by the name in an ascending order.

```typescript
// Query for specific object using primary key.
const specificTask = realm.objectForPrimaryKey(QuickstartTask, testId);

// Query realm for all instances of the "Task" type.
const tasks = realm.objects(QuickstartTask);

// Filter for all tasks with a status of "Open".
const openTasks = tasks.filtered("status = 'Open'");

// Sort tasks by name in ascending order.
const tasksByName = tasks.sorted("name");
```

## Create, Modify, and Delete Realm Objects
Once you have opened a realm, you can create, modify, and delete objects in it. All write operations must occur within a write
transaction.

```typescript
const allTasks = realm.objects(QuickstartTask);

// Add a couple of Tasks in a single, atomic transaction.
realm.write(() => {
  realm.create(QuickstartTask, {
    _id: firstId,
    name: "go grocery shopping",
    status: "Open",
  });

  realm.create(QuickstartTask, {
    _id: secondId,
    name: "go exercise",
    status: "Open",
  });
});

const task1 = allTasks.find(
  (task) => task._id.toString() == firstId.toString()
);
const task2 = allTasks.find(
  (task) => task._id.toString() == secondId.toString()
);

realm.write(() => {
  // Modify an object.
  task1!.status = "InProgress";

  // Delete an object.
  realm.delete(task2!);
});
```

## Watch a Collection
You can watch a realm, collection, or object for changes by registering event handlers with the
`Realm.addListener()`
`Object.addListener()`
`Collection.addListener()`
methods.

> **IMPORTANT:**
> In collection notification handlers, always apply changes
in the following order: deletions, insertions, then
modifications. Handling insertions before deletions may
result in unexpected behavior.
>

In the following example, an application developer watches for changes to the
`Task` collection.

#### Javascript

```javascript
// Define the collection notification listener.
const listener = (tasks, changes) => {
  // Update UI in response to deleted objects.
  changes.deletions.forEach((index) => {
    // Deleted objects cannot be accessed directly,
    // but we can update a UI list, etc. knowing the index.
    console.log(`A task was deleted at the ${index} index.`);
    // ...
  });

  // Update UI in response to inserted objects.
  changes.insertions.forEach((index) => {
    const insertedTasks = tasks[index];
    console.log(`insertedTasks: ${JSON.stringify(insertedTasks, null, 2)}`);
    // ...
  });

  // Update UI in response to modified objects.
  // `newModifications` contains an index to the modified object's position
  // in the collection after all deletions and insertions have been applied.
  changes.newModifications.forEach((index) => {
    const modifiedTask = tasks[index];
    console.log(`modifiedTask: ${JSON.stringify(modifiedTask, null, 2)}`);
    // ...
  });
};

// Observe collection notifications.
tasks.addListener(listener);
```

#### Typescript

```typescript
// Define the collection notification listener.
//@ts-expect-error TYPEBUG: OrderedCollection is incorrectly implemented
const listener: Realm.CollectionChangeCallback = (
  tasks: Realm.OrderedCollection<QuickstartTask>,
  changes: Realm.CollectionChangeSet
) => {
  // Update UI in response to deleted objects.
  changes.deletions.forEach((index) => {
    // Deleted objects cannot be accessed directly,
    // but we can update a UI list, etc. knowing the index.
    console.log(`A task was deleted at the ${index} index.`);
    // ...
  });

  // Update UI in response to inserted objects.
  changes.insertions.forEach((index) => {
    const insertedTasks = tasks[index];
    console.log(`insertedTasks: ${JSON.stringify(insertedTasks, null, 2)}`);
    // ...
  });

  // Update UI in response to modified objects.
  // `newModifications` contains an index to the modified object's position
  // in the collection after all deletions and insertions have been applied.
  changes.newModifications.forEach((index) => {
    const modifiedTask = tasks[index];
    console.log(`modifiedTask: ${JSON.stringify(modifiedTask, null, 2)}`);
    // ...
  });
};

// Observe collection notifications.
//@ts-expect-error TYPEBUG: OrderedCollection is incorrectly implemented
tasks.addListener(listener);
```

## Close a Realm
Call the `realm.close()` method when done
with a realm instance to avoid memory leaks.

```typescript
// Close the realm.
realm.close();
```
