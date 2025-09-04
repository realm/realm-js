# CRUD - Read - Node.js SDK
## Find a Specific Object by Primary Key
If you know the primary key for a given object, you
can look it up directly with `Realm.objectForPrimaryKey()`.

```javascript
const myTask = realm.objectForPrimaryKey("Task", 12342245); // search for a realm object with a primary key that is an int.

```

## Query an Object Type
To query for objects of a given type in a realm, pass the type name to
`Realm.objects()`.

Query operations return a collection of Realm objects that match the
query as a `Realm.Results` object. A basic query
matches all objects of a given type in a realm, but you can also apply a
filter to the collection to find specific objects.

```javascript
// Query realm for all instances of the "Task" type.
const tasks = realm.objects("Task");

```

## Filter Queries
A **filter** selects a subset of results based on the value(s) of one or more
object properties. Realm lets you filter data using
Realm Query Language, a string-based query language to constrain
searches when retrieving objects from a realm.

To filter a query, call `filtered()` on the query results collection.
Pass a Realm Query Language query as argument to `filtered()`.

In the following example, we use the query engine's comparison operators to:

- Find high priority tasks by comparing the value of the `priority` property
value with a threshold number, above which priority can be considered high.
- Find just-started or short-running tasks by seeing if the `progressMinutes`
property falls within a certain range.

```javascript
// retrieve the set of Task objects
const tasks = realm.objects("Task");
// filter for tasks with a high priority
const highPriorityTasks = tasks.filtered("priority > $0", 5);
// filter for tasks that have just-started or short-running progress
const lowProgressTasks = tasks.filtered(
  "$0 <= progressMinutes && progressMinutes < $1",
  1,
  10
);
console.log(
  `Number of high priority tasks: ${highPriorityTasks.length} \n`,
  `Number of just-started or short-running tasks: ${lowProgressTasks.length}`
);

```

> **TIP:**
> To filter a query based on a property of an embedded object or a related object, use dot-notation as if it were in a regular,
nested object.
>

> Seealso:
> - Realm Query Language Reference
> - Query Data - Node.js SDK
>

## Sort Query Results
A **sort** operation allows you to configure the order in which
Realm returns queried objects. You can sort based on one or more
properties of the objects in the results collection. Realm only
guarantees a consistent order of results if you explicitly sort them.

To sort a query, call the `sorted()`
method on the query results collection.

```javascript
// retrieve the set of Task objects
const tasks = realm.objects("Task");
// Sort tasks by name in ascending order
const tasksByName = tasks.sorted("name");
// Sort tasks by name in descending order
const tasksByNameDescending = tasks.sorted("name", true);
// Sort tasks by priority in descending order and then by name alphabetically
const tasksByPriorityDescendingAndName = tasks.sorted([
  ["priority", true],
  ["name", false],
]);
// Sort dogs by dog's owner's name.
let dogsByOwnersName = realm.objects("Dog").sorted("owner.name");

```

> **TIP:**
> To sort a query based on a property of an embedded object or a related object, use dot-notation as if it were in a regular,
nested object.
>
