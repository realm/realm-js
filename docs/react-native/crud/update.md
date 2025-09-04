# CRUD - Update - React Native SDK
The examples on this page use the following schema:

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

## Update an Object
You can add, modify, or delete properties of a Realm object in the same way that
you would update any other JavaScript object. But, you must do it inside of a
write transaction.

In the following example of a `TaskItem` component, we:

1. Get access to the opened realm instance by calling the `useRealm()` hook within the component.
2. Retrieve a task by calling `useObject()` with "Task" and the `_id` parameter of the component.
3. Create a component method `incrementTaskProgress()` that performs a write transaction and increments the task's `progressMinutes`.
4. Render the task's `name` and `progressMinutes` in the UI.
5. Add an [onPress](https://reactnative.dev/docs/handling-touches) event on the "increment" button that calls `incrementTaskProgress()`.

#### Javascript

```javascript
const TaskItem = ({_id}) => {
  const realm = useRealm();
  const myTask = useObject(Task, _id);

  const incrementTaskProgress = () => {
    if (myTask) {
      realm.write(() => {
        myTask.progressMinutes += 1;
      });
    }
  };
  if (myTask) {
    return (
      <>
        <Text>Task: {myTask.name}</Text>
        <Text>Progress made (in minutes):</Text>
        <Text>{myTask.progressMinutes}</Text>
        <Button
          onPress={() => incrementTaskProgress()}
          title='Increment Task Progress'
        />
      </>
    );
  } else {
    return <></>;
  }
};

```

#### Typescript

```typescript
const TaskItem = ({_id}: {_id: number}) => {
  const realm = useRealm();
  const myTask = useObject(Task, _id);

  const incrementTaskProgress = () => {
    if (myTask) {
      realm.write(() => {
        myTask.progressMinutes! += 1;
      });
    }
  };

  if (myTask) {
    return (
      <>
        <Text>Task: {myTask.name}</Text>
        <Text>Progress made (in minutes):</Text>
        <Text>{myTask.progressMinutes}</Text>
        <Button
          onPress={() => incrementTaskProgress()}
          title='Increment Task Progress'
        />
      </>
    );
  } else {
    return <></>;
  }
};

```

> **TIP:**
> To update a property of an embedded object or
a related object, modify the property with
[dot-notation or bracket-notation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Property_accessors) as if it were in a
regular, nested object.
>

## Upsert an Object
To upsert an object within a write transaction, call `Realm.create()` with the update mode set to `modified`. The operation
either inserts a new object with the given primary key or updates an existing
object that already has that primary key.

> **NOTE:**
> You **must** call `Realm.create()` within a write transaction to upsert an object.
This is different than creating a new `Realm.Object` by
calling the [new](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/new) operator.
>

In the following example of a `CreateTaskItem` component we:

1. Get access to the opened realm instance by calling the `useRealm()` hook within the component.
2. Perform a write transaction, and create a `Task` object with an `_id` value of `1234`.
3. Call `Realm.create()` inside the write transaction to upsert a `Task` object by specifying the same `_id` and a different``progressMinutes`` and the update mode set to "modified".
4. Render the task's `name` and `progressMinutes` in the UI, showing the modified progress.

#### Javascript

```javascript
const CreateTaskItem = () => {
  const realm = useRealm();

  let myTask;
  realm.write(() => {
    // Add a new Task to the realm. Since no task with ID 1234
    // has been added yet, this adds the instance to the realm.
    myTask = realm.create(
      'Task',
      {_id: 1234, name: 'Wash the car', progressMinutes: 0},
      'modified',
    );

    // If an object exists, setting the third parameter (`updateMode`) to
    // "modified" only updates properties that have changed, resulting in
    // faster operations.
    myTask = realm.create(
      'Task',
      {_id: 1234, name: 'Wash the car', progressMinutes: 5},
      'modified',
    );
  });
  return (
    <>
      <Text>{myTask.name}</Text>
      <Text>Progress made (in minutes):</Text>
      <Text>{myTask.progressMinutes}</Text>
    </>
  );
};

```

#### Typescript

```typescript
const CreateTaskItem = () => {
  const realm = useRealm();

  const myTask: Realm.Object = realm.write(() => {
    // Add a new Task to the realm. Since no Task with ID 1234
    // has been added yet, this adds the instance to the realm.
    realm.create(
      'Task',
      {_id: 1234, name: 'Wash the car', progressMinutes: 0},
      'modified',
    );

    // If an object exists, setting the third parameter (`updateMode`) to
    // "modified" only updates properties that have changed, resulting in
    // faster operations.
    return realm.create(
      'Task',
      {_id: 1234, name: 'Wash the car', progressMinutes: 5},
      'modified',
    );
  });

  return (
    <>
      <Text>{myTask.name}</Text>
      <Text>Progress made (in minutes):</Text>
      <Text>{myTask.progressMinutes}</Text>
    </>
  );
};

```

## Bulk Update a Collection
To apply an update to a collection of objects, iterate through the collection
(e.g. with [for...of](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for...of)). In the loop, update each object individually.

In the following example of a `TaskDashboard` component, we:

1. Get access to the opened realm instance by calling the `useRealm()` hook
within the component.
2. Retrieve all tasks in the realm instance by passing `Task` to the
`useQuery()` hook.
3. Create a component method `resetProgressOnAllTasks()` that performs a
write transaction. Within that write transaction, we bulk update all tasks
by looping through them using `for...of` and set their
`progressMinutes` to 0.
4. [Map](https://react.dev/learn/rendering-lists) through the tasks to
render a list of `Text` components displaying each task's `name` and
`progressMinutes`.

```typescript

const TaskDashboard = () => {
  const realm = useRealm();
  const tasks = useQuery(Task);

  const resetProgressOnAllTasks = () => {
    realm.write(() => {
      for (const task of tasks) {
        task.progressMinutes = 0;
      }
    });
  };

  return (
    <>
      {tasks.map(task => {
        <Text>
          {task.name} has {task.progressMinutes} minutes progressed
        </Text>;
      })}
      <Button
        onPress={resetProgressOnAllTasks}
        title='Reset Progress'
      />
    </>
  );
};

```
