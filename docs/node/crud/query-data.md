# Query Data - Node.js SDK
To filter data in your Realms, construct queries with Realm Query Language.
Queries always reflect the latest state of an
object and emit notifications that can
update your app whenever data changes.

For more information about syntax, usage and limitations,
refer to the [Realm Query Language reference](../../realm-query-language.md).

## Results Collections
A results collection represents all objects in a realm that match a query
operation. In general you can work with a collection like a regular JavaScript
array but collections don't actually hold matching Realm objects in memory.
Instead they reference the matched objects, which themselves map directly to data
in the realm file.

> **NOTE:**
> Some queries only need to access a subset of all objects that match the query.
Realm's lazy-loaded collections only fetch objects when you actually
access them, so you do not need any special mechanism to limit query results.
>
> For example, if you only want to find 10 matching objects at a time (such as
in a paged product catalog) you can just access ten elements of the results
collection. To advance to the next page, access the next ten elements of the
results collection starting at the index immediately following the last
element of the previous page.
>

## Examples on This Page
The examples in this page use a simple data set for a
task list app. The two Realm object types are `Project`
and `Task`. A `Task` has a name, assignee's name, and
completed flag. There is also an arbitrary number for
priority (higher is more important) and a count of
minutes spent working on it. A `Project` has zero or more
`Tasks`.

See the schema for these two classes, `Project` and
`Task`:

```javascript
const TaskSchema = {
  name: "Task",
  properties: {
    name: "string",
    isComplete: "bool",
    priority: "int",
    progressMinutes: "int",
    assignee: "string?"
  }
};

const ProjectSchema = {
  name: "Project",
  properties: {
    name: "string",
    tasks: "Task[]"
  }
};

```

## Construct a Query
To filter data, pass a query made with Realm Query Language to
`Realm.Results.filtered()`.

```js
const items = realm.objects("Item");
// Gets all items where the 'priority' property is 7 or more.
const importantItems = items.filtered("priority >= $0", 7);

```

### Filter with Full-Text Search
You can use Realm Query Language (RQL) to query on properties that have a
Full-Text Search (FTS) index.
To query an FTS indexed property, use the `TEXT` predicate in your `filtered()` query.

Exclude results for a word by placing the hyphen (`-`) character in front of the word.
For example, a search for `swan -lake` would include all search results for
`swan` excluding those with `lake`.

In the following example, we query on the `Book.name` field using the
following `Book` object model:

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

```typescript
// Retrieve book objects from realm
const books = realm.objects(Book);

// Filter for books with 'hunger' in the name
const booksWithHunger = books.filtered("name TEXT $0", "hunger");

// Filter for books with 'swan' but not 'lake' in the name
const booksWithSwanWithoutLake = books.filtered("name TEXT $0", "swan -lake");

```

#### Full-Text Search Tokenizer Details
Full-Text Search (FTS) indexes support:

- Boolean match word searches, not searches for relevance.
- Tokens are diacritics- and case-insensitive.
- Words split by a hyphen (`-`), like `full-text`, are split into two tokens.
- Tokens can only consist of characters from ASCII and the Latin-1 supplement (western languages).
All other characters are considered whitespace.

## Operators
There are several types of operators available to filter a
Realm collection.
Filters work by **evaluating** an operator expression for
every object in the collection being
filtered. If the expression resolves to `true`, Realm
Database includes the object in the results collection.

An **expression** consists of one of the following:

- The name of a property of the object currently being evaluated.
- An operator and up to two argument expression(s).
- A literal string, number, or date.

### Comparison Operators
The most straightforward operation in a search is to compare
values. Realm Query Language has standard comparison operators like `==`,
`>`, `>=`, `in`, `<`, `<=`, and `!=`.

For complete documentation on comparison operators,
refer to the Realm Query Language comparison operator reference.

The following example uses the query engine's comparison operators to:

- Find high priority tasks by comparing the value of the `priority`
property value with a threshold number, above which priority can be considered high.
- Find just-started or short-running tasks by seeing if the `progressMinutes`
property falls within a certain range.
- Find unassigned tasks by finding tasks where the `assignee` property
is equal to `null`.
- Find tasks assigned to specific teammates Ali or Jamie by seeing if
the `assignee` property is in a list of names.

```javascript
const highPriorityTasks = tasks.filtered("priority > $0", 5);
const unassignedTasks = tasks.filtered("assignee == $0", null);
const lowProgressTasks = tasks.filtered("$0 <= progressMinutes && progressMinutes < $1", 1, 10);
const aliTasks = tasks.filtered("assignee == $0", "Ali");

console.log(
  `Number of high priority tasks: ${highPriorityTasks.length}`,
  `Number of unassigned tasks: ${unassignedTasks.length}`,
  `Number of just-started or short-running tasks: ${lowProgressTasks.length}`,
  `Number of tasks for Ali: ${aliTasks.length}`
);

```

### Logical Operators
Create compound predicates using logical operators. Realm Query Language
has standard logical operators like `AND`, `OR`, and `NOT`.

For complete documentation on logical operators,
refer to the Realm Query Language logical operator reference.

The following example uses Realm Query Language's logical operators to find
all of Ali's completed tasks. We find all tasks
where the `assignee` property value is equal to 'Ali' AND
the `isComplete` property value is `true`.

```javascript
console.log(
  "Number of Ali's complete tasks: " +
    tasks.filtered("assignee == $0 && isComplete == $1", "Ali", true).length
);

```

### String Operators
You can compare string values using string operators like `==`, `beginsWith`,
`contains`, and `endsWith`. You can also use the `LIKE` operator
to search with regex-like wildcards.

For complete documentation on string operators,
refer to the Realm Query Language string operator reference.

The following example uses Realm Query Language's string operators to find
projects with a name starting with the letter 'e' and
projects with names that contain 'ie'.

```javascript
// Use [c] for case-insensitivity.
console.log(
  "Projects that start with 'e': " +
    projects.filtered("name BEGINSWITH[c] $0", 'e').length
);
console.log(
  "Projects that contain 'ie': " +
    projects.filtered("name CONTAINS $0", 'ie').length
);
```

### Aggregate Operators
Traverse a collection and reduce it
to a single value with an aggregate operator.

For complete documentation on aggregate operators,
refer to the Realm Query Language aggregate operator reference.

The following examples uses aggregate operators to show different facets of
the data:

- `@avg` to show projects with average tasks priority above 5.
- `@sum` to show long running projects.

```javascript
console.log(
  "Number of projects with average tasks priority above 5: " +
    projects.filtered("tasks.@avg.priority > $0", 5).length
);
console.log(
  "Number of long-running projects: " +
    projects.filtered("tasks.@sum.progressMinutes > $0", 120).length
);

```

### Collection Operators
A **collection operator** uses rules to determine whether
to pass each input collection object to the output
collection by applying a given predicate to every element of
a given list property of the object.

For complete documentation on collection operators,
refer to the Realm Query Language collection operator reference.

The following examples uses Realm Query Language's collection operators to find:

- `ALL` for projects with no complete tasks.
- `ANY` for projects with any top priority tasks.

```javascript
console.log(
  "Number of projects with no complete tasks: " +
    projects.filtered("ALL tasks.isComplete == $0", false).length
);
console.log(
  "Number of projects with any top priority tasks: " +
    projects.filtered("ANY tasks.priority == $0", 10).length
);

```

## Summary
- Use `Realm.Results.filtered()` to filter
data in your realm using Realm Query Language.
- For a detailed explanation of Realm Query Language, refer to the
Realm Query Language reference.
- There are several categories of **operators** available to filter results:
- comparison
- logical
- string
- aggregate
- set
