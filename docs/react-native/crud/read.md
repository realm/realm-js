# CRUD - Read - React Native SDK
Read operations are queries to find your data stored in Realm. Data in Realm
is *live*, which means that an object always reflects its most recent saved
state and read operations never block. Objects automatically update in
response to changes, so you can see up-to-date data in your application
without running a new query.

Use the following `@realm/react` hooks to read data in a realm:

- `useObject()`: Find a specific object by primary key.
- `useQuery()`: Get a collection of objects by object type.

These hooks return live objects, which are automatically updated when the data in the realm changes. When objects returned by these hooks are updated,
the component calling the hook rerenders.

The examples on this page use the following schemas:

#### Javascript

```javascript
class Person extends Realm.Object {
  static schema = {
    name: 'Person',
    properties: {
      name: 'string',
      age: 'int?',
    },
  };
}

```

```typescript
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
class Person extends Realm.Object<Person> {
  name!: string;
  age?: number;

  static schema: ObjectSchema = {
    name: 'Person',
    properties: {
      name: 'string',
      age: 'int?',
    },
  };
}

```

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

## Find a Specific Object by Primary Key
If you know the primary key for a given
object, you can look it up directly by passing the class type and primary key to
the `useObject()` hook.

In the following example of a `TaskItem` component, we use the `useObject()`
hook to find a task based on its primary key: `_id`. Then we render the task's
name and priority in the UI.

#### Javascript

```javascript
const TaskItem = ({_id}) => {
  const myTask = useObject(Task, _id);

  return (
    <View>
      {myTask ? (
        <Text>
          {myTask.name} is a task with the priority of: {myTask.priority}
        </Text>
      ) : null}
    </View>
  );
};

```

#### Typescript

```typescript
const TaskItem = ({_id}: {_id: number}) => {
  const myTask = useObject(Task, _id);
  return (
    <View>
      {myTask ? (
        <Text>
          {myTask.name} is a task with the priority of: {myTask.priority}
        </Text>
      ) : null}
    </View>
  );
};

```

## Query for an Object Type and Filter Results
The `useQuery()` hook returns a collection of Realm objects that match the query as a
`Realm.Results` object. A basic query matches all
objects of a given type in a realm, but you can also apply a filter to the
collection to find specific objects.

A **filter** selects a subset of results based on the value(s) of one or more
object properties. Realm lets you filter data using
Realm Query Language, a string-based query language to constrain
searches when retrieving objects from a realm.

Call `filtered()` on the query results
collection to filter a query. Pass a Realm Query Language query as an argument
to `filtered()`.

In the following example of a `TaskList` component, we:

1. Obtain all `Task` objects by passing "Task" to the `useQuery()` hook.
2. Obtain all high-priority tasks and low-progress task by passing a query to `filtered()`.
3. Use the map function to render a list of Text components displaying information about the high-priority and low-progress tasks.

#### Javascript

```javascript
const TaskList = () => {
  const [priority, setPriority] = useState(4);
  // filter for tasks with a high priority
  const highPriorityTasks = useQuery(
    Task,
    (tasks) => {
      return tasks.filtered("priority >= $0", priority);
    },
    [priority]
  );

  // filter for tasks that have just-started or short-running progress
  const lowProgressTasks = useQuery(Task, tasks => {
    return tasks.filtered(
      '$0 <= progressMinutes && progressMinutes < $1',
      1,
      10,
    );
  });

  return (
    <>
      <Text>Your high priority tasks:</Text>
      {highPriorityTasks.map(taskItem => {
        return <Text>{taskItem.name}</Text>;
      })}
      <Text>Your tasks without much progress:</Text>
      {lowProgressTasks.map(taskItem => {
        return <Text>{taskItem.name}</Text>;
      })}
    </>
  );
};

```

#### Typescript

```typescript
const TaskList = () => {
  const [priority, setPriority] = useState(4);
  // filter for tasks with a high priority
  const highPriorityTasks = useQuery(
    Task,
    tasks => {
      return tasks.filtered('priority >= $0', priority);
    },
    [priority],
  );

  // filter for tasks that have just-started or short-running progress
  const lowProgressTasks = useQuery(Task, tasks => {
    return tasks.filtered(
      '$0 <= progressMinutes && progressMinutes < $1',
      1,
      10,
    );
  });

  return (
    <>
      <Text>Your high priority tasks:</Text>
      {highPriorityTasks.map(taskItem => {
        return <Text>{taskItem.name}</Text>;
      })}
      <Text>Your tasks without much progress:</Text>
      {lowProgressTasks.map(taskItem => {
        return <Text>{taskItem.name}</Text>;
      })}
    </>
  );
};

```

> **TIP:**
> To filter a query based on a property of an embedded object or a related object, use dot-notation as if it were in a regular,
nested object.
>

> Seealso:
> - Realm Query Language Reference
> - Query Data - React Native SDK
>

## Query for an Object Type and Sort Results
A **sort** operation allows you to configure the order in which
Realm returns queried objects. You can sort based on one or more
properties of the objects in the results collection. Realm only
guarantees a consistent order of results if you explicitly sort them.

To sort a query, call the `sorted()`
method on the query results collection.

In the following example of a `TaskList` component, we use the `useQuery()`
hook to initially retrieve the set of Task objects. We then use the
`sorted()` method to work with the data in various ways:

1. Sort objects based on the task's name alphabetically.
2. Sort objects based on the task's name alphabetically in descending order.
3. Sort objects based on the task's priority in descending order and the task's name in ascending order.
4. Sort objects based on the assignee object's name alphabetically.

Finally, we map through each list of tasks and render them in the UI.

#### Javascript

```javascript
const TaskList = () => {
  // retrieve the set of Task objects
  const tasks = useQuery(Task);
  // Sort tasks by name in ascending order
  const tasksByName = useQuery(Task, tasks => {
    return tasks.sorted('name');
  });
  // Sort tasks by name in descending order
  const tasksByNameDescending = useQuery(Task, tasks => {
    return tasks.sorted('name', true);
  });
  // Sort tasks by priority in descending order and then by name alphabetically
  const tasksByPriorityDescendingAndName = useQuery(Task, tasks => {
    return tasks.sorted([
      ['priority', true],
      ['name', false],
    ]);
  });
  // Sort Tasks by Assignee's name.
  const tasksByAssigneeName = useQuery(Task, tasks => {
    return tasks.sorted('assignee.name');
  });

  return (
    <>
      <Text>All tasks:</Text>
      {tasks.map(task => (
        <Text>{task.name}</Text>
      ))}

      <Text>Tasks sorted by name:</Text>
      {tasksByName.map(task => (
        <Text>{task.name}</Text>
      ))}

      <Text>Tasks sorted by name descending:</Text>
      {tasksByNameDescending.map(task => (
        <Text>{task.name}</Text>
      ))}

      <Text>
        Tasks sorted by priority descending, and name alphabetically:
      </Text>
      {tasksByPriorityDescendingAndName.map(task => (
        <Text>
          {task.name}
        </Text>
      ))}

      <Text>Tasks sorted by assignee name:</Text>
      {tasksByAssigneeName.map(task => (
        <Text>{task.name}</Text>
      ))}
    </>
  );
};

```

#### Typescript

```typescript
const TaskList = () => {
  // retrieve the set of Task objects
  const tasks = useQuery(Task);
  // Sort tasks by name in ascending order
  const tasksByName = useQuery(Task, tasks => {
    return tasks.sorted('name');
  });
  // Sort tasks by name in descending order
  const tasksByNameDescending = useQuery(Task, tasks => {
    return tasks.sorted('name', true);
  });
  // Sort tasks by priority in descending order and then by name alphabetically
  const tasksByPriorityDescendingAndName = useQuery(Task, tasks => {
    return tasks.sorted([
      ['priority', true],
      ['name', false],
    ]);
  });
  // Sort Tasks by Assignee's name.
  const tasksByAssigneeName = useQuery(Task, tasks => {
    return tasks.sorted('assignee.name');
  });

  return (
    <>
      <Text>All tasks:</Text>
      {tasks.map(task => (
        <Text>{task.name}</Text>
      ))}

      <Text>Tasks sorted by name:</Text>
      {tasksByName.map(task => (
        <Text>{task.name}</Text>
      ))}

      <Text>Tasks sorted by name descending:</Text>
      {tasksByNameDescending.map(task => (
        <Text>{task.name}</Text>
      ))}

      <Text>
        Tasks sorted by priority descending, and name alphabetically:
      </Text>
      {tasksByPriorityDescendingAndName.map(task => (
        <Text>
          {task.name}
        </Text>
      ))}

      <Text>Tasks sorted by assignee name:</Text>
      {tasksByAssigneeName.map(task => (
        <Text>{task.name}</Text>
      ))}
    </>
  );
};

```

> **TIP:**
> To sort a query based on a property of an embedded object or a related object, use dot-notation as if it were in a
regular, nested object.
>
