# Realm Query Language
Realm Query Language (RQL) is a string-based query language to constrain
searches when retrieving objects from a realm. SDK-specific methods pass queries
to the Realm query engine, which retrieves matching objects from the realm.
Realm Query Language syntax is based on [NSPredicate](https://developer.apple.com/documentation/foundation/nspredicate).

Queries evaluate a predicate for every object in the collection being queried.
If the predicate resolves to `true`, the results collection includes the object.

You can use Realm Query Language in most Realm SDKs with your SDK's filter
or query methods. The Swift SDK is the exception, as it uses the
NSPredicate query API.
Some SDKs also support idiomatic APIs for querying realms in their language.

## Query with Realm SDKs
For further reading on SDK-specific methods for querying realms, see the documentation
for your SDK:

- Filter Queries - Node.Js SDK
- Filter Queries - React Native SDK

You can also use Realm Query Language to browse for data in
Realm Studio. Realm Studio is a visual tool
to view, edit, and design Realm files.

## Examples on This Page
Many of the examples in this page use a simple data set for a to-do list app.
The two Realm object types are `Project` and `Item`.

- An `Item` has a name, assignee's name, and completed flag.
There is also an arbitrary number for priority (higher is more important)
and a count of minutes spent working on it.
- A `Project` has zero or more `Items` and an optional quota
for minimum number of to-do items expected to be completed.

See the schema for these two classes, `Project` and `Item`, below:

#### Node

```javascript
const ItemModel = {
  name: "Item",
  properties: {
    id: "objectId",
    name: {type: "string", indexed: "full-text"},
    isComplete: { type: "bool", default: false },
    assignee: "string?",
    priority: {
      type: "int",
      default: 0,
    },
    progressMinutes: {
      type: "int",
      default: 0,
    },
    projects: {
      type: "linkingObjects",
      objectType: "Project",
      property: "items",
    },
  },
  primaryKey: "id",
};

const ProjectModel = {
  name: "Project",
  properties: {
    id: "objectId",
    name: "string",
    items: "Item[]",
    quota: "int?",
  },
  primaryKey: "id",
};

```

#### React Native

```javascript
const ItemModel = {
  name: "Item",
  properties: {
    id: "objectId",
    name: {type: "string", indexed: "full-text"},
    isComplete: { type: "bool", default: false },
    assignee: "string?",
    priority: {
      type: "int",
      default: 0,
    },
    progressMinutes: {
      type: "int",
      default: 0,
    },
    projects: {
      type: "linkingObjects",
      objectType: "Project",
      property: "items",
    },
  },
  primaryKey: "id",
};

const ProjectModel = {
  name: "Project",
  properties: {
    id: "objectId",
    name: "string",
    items: "Item[]",
    quota: "int?",
  },
  primaryKey: "id",
};

```

## Expressions
Filters consist of **expressions** in a predicate. An expression consists of
one of the following:

- The name of a property of the object currently being evaluated.
- An operator and up to two argument expression(s). For example, in the
expression `A + B`, the entirety of `A + B` is an expression, but `A`
and `B` are also argument expressions to the operator `+`.
- A value, such as a string (`'hello'`) or a number (`5`).

```javascript
"progressMinutes > 1 AND assignee == $0", "Ali"

```

## Parameterized Queries
Create parameterized queries to interpolate variables into prepared
Realm Query Language statements. The syntax for interpolated variables is
`$<int>`, starting at `0`. Pass the positional arguments as
additional arguments to Realm SDK methods that use Realm Query Language.

Include just one parameter with `$0`.

```js
"progressMinutes > 1 AND assignee == $0", "Ali"

```

Include multiple parameters with ascending integers starting at `$0`.

```js
"progressMinutes > $0 AND assignee == $1", 1, "Alex"

```

### Query Formats
The following table shows how a query should be formatted when serialized and
parameterized for the following data types:

|Type|Parameterized Example|Serialized Example|Note|
| --- | --- | --- | --- |
|Boolean|"setting == $0", false|"setting == false"|`true` or `false` values.|
|String|"name == $0", "George"|"name == 'George'"|Applies to `string` and `char` data type.|
|Number|"age > $0", 5.50|"age > 5.50"|Applies to `int`, `short`, `long`, `double`, `Decimal128`, and `float` data types.|
|Date|"date < $0", dateObject|"date < 2021-02-20@17:30:15:0"|For parameterized date queries, you must pass in a date object. For serialized date queries, you can represented the date in the following formats: As an explicit date and time- YYYY-MM-DD@HH:mm:ss:nn (year-month-day@hours:minutes:seconds:nanoseconds) As a `datetime` relative to the [Unix epoch](https://en.wikipedia.org/wiki/Unix_time)- Ts:n (T, designates the start of the time; `s`, seconds; `n`, nanoseconds) Parameterized `Date` object|
|ObjectID|"_id == $0", oidValue|"_id == oid(507f1f77bcf86cd799439011)"|For parameterized ObjectId queries, you must pass in an ObjectId. For serialized ObjectId queries, the string representation is `oid(<ObjectId String>)`.|
|UUID|"id == $0", uuidValue|"id == uuid(d1b186e1-e9e0-4768-a1a7-c492519d47ee)"|For parameterized UUID queries, you must pass in a UUID. For serialized UUID queries, the string representation is `uuid(<UUID String>)`.|
|Binary|"value == $0", "binary"|"value == 'binary'"|For ASCII characters, RQL serializes the binary value like a string, with quotes. For non-printable characters, RQL serializes the binary to a base 64 value.|
|List|"ANY items.name == {$0, $1}", "milk", "bread"|"ANY items.name == {'milk', 'bread'}"|Applies for list, collections, and sets. A parameterized value should be used for each member of the list.|
|RealmObject|"ANY items == $0", obj("Item", oid(6489f036f7bd0546377303ab))|"ANY items == obj('Item', oid(6489f036f7bd0546377303ab))"|To pass in a RealmObject, you need the class and primary key of the object.|

## Dot Notation
When referring to an object property, you can use **dot notation** to refer
to child properties of that object. You can even refer to the properties of
embedded objects and relationships with dot notation.

For example, consider a query on an object with a `workplace` property that
refers to a Workplace object. The Workplace object has an embedded object
property, `address`. You can chain dot notations to refer to the zipcode
property of that address:

```js
"workplace.address.zipcode == 10019"

```

## Nil Type
Realm Query Language include the `nil` type to represent a null pointer.
You can either reference `nil` directly in your queries or with a parameterized query.
If you're using a parameterized query, each SDK maps its respective null pointer
to `nil`.

```js
"assignee == nil"

```

```js
// comparison to language null pointer
"assignee == $0", null

```

## Comparison Operators
The most straightforward operation in a search is to compare
values.

> **IMPORTANT:**
> The type on both sides of the operator must be equivalent. For
example, comparing an ObjectId with string will result in a precondition
failure with a message like:
>
> ```
> "Expected object of type object id for property 'id' on object of type
> 'User', but received: 11223344556677889900aabb (Invalid value)"
> ```
>
> You can compare any numeric type with any other numeric type,
including decimal, float, and Decimal128.
>

|Operator|Description|
| --- | --- |
|`BETWEEN {number1, number2}`|Evaluates to `true` if the left-hand numerical or date expression is between or equal to the right-hand range. For dates, this evaluates to `true` if the left-hand date is within the right-hand date range.|
|== , =|Evaluates to `true` if the left-hand expression is equal to the right-hand expression.|
|>|Evaluates to `true` if the left-hand numerical or date expression is greater than the right-hand numerical or date expression. For dates, this evaluates to `true` if the left-hand date is later than the right-hand date.|
|>=|Evaluates to `true` if the left-hand numerical or date expression is greater than or equal to the right-hand numerical or date expression. For dates, this evaluates to `true` if the left-hand date is later than or the same as the right-hand date.|
|IN|Evaluates to `true` if the left-hand expression is in the right-hand list. This is equivalent to and used as a shorthand for `== ANY`.|
|<|Evaluates to `true` if the left-hand numerical or date expression is less than the right-hand numerical or date expression. For dates, this evaluates to `true` if the left-hand date is earlier than the right-hand date.|
|<=|Evaluates to `true` if the left-hand numeric expression is less than or equal to the right-hand numeric expression. For dates, this evaluates to `true` if the left-hand date is earlier than or the same as the right-hand date.|
|!= , <>|Evaluates to `true` if the left-hand expression is not equal to the right-hand expression.|

> Example:
> The following example uses Realm Query Language's comparison operators to:
>
> - Find high priority to-do items by comparing the value of the `priority`
property value with a threshold number, above which priority can be considered high.
> - Find long-running to-do items by seeing if the `progressMinutes` property
is at or above a certain value.
> - Find unassigned to-do items by finding items where the `assignee` property
is equal to `null`.
> - Find to-do items within a certain time range by finding items where the
`progressMinutes` property is between two numbers.
> - Find to-do items with a certain amount of `progressMinutes` from the
given list.
>
> ```javascript
>   // Find high priority to-do items by comparing the value of the ``priority``
>   // property value with a threshold number, above which priority can be considered high.
>   "priority > $0", 5
>
>   // Find long-running to-do items by seeing if the progressMinutes property is at or above a certain value.
>   "progressMinutes > $0", 120
>
>   // Find unassigned to-do items by finding items where the assignee property is equal to null.
>   "assignee == $0", null
>
>   // Find to-do items within a certain time range by finding items
>   // where the progressMinutes property is between two numbers.
>   "progressMinutes BETWEEN { $0 , $1 }", 30, 60
>
>   // Find to-do items with a certain amount of progressMinutes from the given list.
>   "progressMinutes IN { $0, $1, $2, $3, $4, $5 }", 10, 20, 30, 40, 50, 60
>
> ```
>

## Logical Operators
Make compound predicates using logical operators.

|Operator|Description|
| --- | --- |
|AND &&|Evaluates to `true` if both left-hand and right-hand expressions are `true`.|
|NOT !|Negates the result of the given expression.|
|OR \\|\\||Evaluates to `true` if either expression returns `true`.|

> Example:
> We can use the query language's logical operators to find
all of Ali's completed to-do items. That is, we find all items
where the `assignee` property value is equal to 'Ali' AND
the `isComplete` property value is `true`:
>
> ```javascript
> "assignee == $0 AND isComplete == $1", "Ali", true
>
> ```
>

## String Operators
Compare string values using these string operators.
Regex-like wildcards allow more flexibility in search.

> **NOTE:**
> You can use the following modifiers with the string operators:
>
> - `[c]` for case insensitivity. `"name CONTAINS[c] $0", 'a'`
>

|Operator|Description|
| --- | --- |
|BEGINSWITH|Evaluates to `true` if the left-hand string expression begins with the right-hand string expression. This is similar to `contains`, but only matches if the right-hand string expression is found at the beginning of the left-hand string expression.|
|CONTAINS|Evaluates to `true` if the right-hand string expression is found anywhere in the left-hand string expression.|
|ENDSWITH|Evaluates to `true` if the left-hand string expression ends with the right-hand string expression. This is similar to `contains`, but only matches if the left-hand string expression is found at the very end of the right-hand string expression.|
|LIKE|Evaluates to `true` if the left-hand string expression matches the right-hand string wildcard string expression. A wildcard string expression is a string that uses normal characters with two special wildcard characters: The `*` wildcard matches zero or more of any character The `?` wildcard matches any character. For example, the wildcard string "d?g" matches "dog", "dig", and "dug", but not "ding", "dg", or "a dog".|
|== , =|Evaluates to `true` if the left-hand string is lexicographically equal to the right-hand string.|
|!= , <>|Evaluates to `true` if the left-hand string is not lexicographically equal to the right-hand string.|

> Example:
> We use the query engine's string operators to find:
>
> - Projects with a name starting with the letter 'e'
> - Projects with names that contain 'ie'
>
> ```javascript
>   "name BEGINSWITH[c] $0", 'e'
>
>   "name CONTAINS $0", 'ie'
>
> ```
>

## ObjectId and UUID Operators
Query [BSON ObjectIds](https://www.mongodb.com/docs/manual/reference/method/ObjectId/) and
[UUIDs](https://www.mongodb.com/docs/manual/reference/method/UUID/).
These data types are often used as primary keys.

To query with ObjectIds, use a parameterized query. Pass the ObjectId or UUID
you're querying against as the argument.

```js
"_id == $0", oidValue

```

You can also put a string representation of the ObjectId you're evaluating
in `oid(<ObjectId String>)`.

```js
"_id == oid(6001c033600510df3bbfd864)"

```

To query with UUIDs, put a string representation of the UUID you're evaluating
in `uuid(<UUID String>)`.

```js
"id == uuid(d1b186e1-e9e0-4768-a1a7-c492519d47ee)"

```

|Operator|Description|
| --- | --- |
|== , =|Evaluates to `true` if the left-hand value is equal to the right-hand value.|
|!= , <>|Evaluates to `true` if the left-hand value is not equal to the right-hand value.|

## Arithmetic Operators
Perform basic arithmetic in one side of a RQL expression when evaluating
numeric data types.

```js
  "2 * priority > 6"
  // Is equivalent to
  "priority >= 2 * (2 - 1) + 2"

```

You can also use multiple object properties together in a mathematic operation.

```js
"progressMinutes * priority == 90"

```

|Operator|Description|
| --- | --- |
|*|Multiplication.|
|/|Division.|
|+|Addition.|
|-|Subtraction.|
|()|Group expressions together.|

## Type Operator
Check the type of a property using the `@type` operator.
You can only use the type operator with mixed types and dictionaries.

Evaluate the property against a string representation of the data type name.
Refer to SDK documentation on the mapping from the SDK language's data types
to Realm data types.

|Operator|Description|
| --- | --- |
|`@type`|Check if type of a property is the property name as a string. Use `==` and `!=` to compare equality.|

```js
  "mixedType.@type == 'string'"

  "mixedType.@type == 'bool'"

```

## Dictionary Operators
Compare dictionary values using these dictionary operators.

|Operator|Description|
| --- | --- |
|`@values`|Returns objects that have the value specified in the right-hand expression.|
|`@keys`|Returns objects that have the key specified in the right-hand expression.|
|`@size`, `@count`|The number of elements in a dictionary.|
|`Dictionary['key']`|Access the value at a key of a dictionary.|
|`ALL \| ANY \| NONE <property>.@type`|Checks if the dictionary contains properties of certain type.|

You can also use dictionary operators in combination with
comparison operators to filter objects
based on dictionary keys and values. The following examples show some ways
to use dictionary operators with comparison operators. All examples query
a collection of Realm objects with a dictionary property named `dict`.

> Example:
> The following examples use various dictionary operators.
>
> ```js
>   // Evaluates if there is a dictionary key with the name 'foo'
>   "ANY dict.@keys == $0", 'foo'
>
>   // Evaluates if there is a dictionary key with key 'foo' and value 'bar
>   "dict['foo'] == $0", 'bar'
>
>   // Evaluates if there is greater than one key-value pair in the dictionary
>   "dict.@count > $0", 1
>
>   // Evaluates if dictionary has property of type 'string'
>   "ANY dict.@type == 'string'"
>
>   // Evaluates if all the dictionary's values are integers
>   "ALL dict.@type == 'bool'"
>
>   // Evaluates if dictionary does not have any values of type int
>   "NONE dict.@type == 'double'"
>
>   // ANY is implied.
>   "dict.@type == 'string'"
>
> ```
>

## Date Operators
Query date types in a realm.

Generally, you should use a parameterized query to pass a date data type
from the SDK language you are using to a query.

```js
"timeCompleted < $0", someDate

```

You can also specify dates in the following two ways:

- As a specific date (in UTC)- `YYYY-MM-DD@HH:mm:ss:nnnnnnnnnn` (year-month-day@hours:minutes:seconds:nanoseconds), UTC.
You can also use `T` instead of `@` to separate the date from the time.
- As a time in seconds since the [Unix epoch](https://en.wikipedia.org/wiki/Unix_time)- `Ts:n`, where `T` designates the start of the time,
`s` is the number of seconds, and `n` is the number of nanoseconds.

Date supports comparison operators.

> Example:
> The following example shows how to use a parameterized query with
a date object:
>
> ```js
> var date = new Date("2021-02-20@17:30:15:0");
>
>   "timeCompleted > $0", date
> ```
>

## Aggregate Operators
Apply an aggregate operator to a collection property of a Realm
object. Aggregate operators traverse a collection and reduce it to a
single value.

|Operator|Description|
| --- | --- |
|@avg|Evaluates to the average value of a given numerical property across a collection. If any values are `null`, they are not counted in the result.|
|@count|Evaluates to the number of objects in the given collection.|
|@max|Evaluates to the highest value of a given numerical property across a collection. `null` values are ignored.|
|@min|Evaluates to the lowest value of a given numerical property across a collection. `null` values are ignored.|
|@sum|Evaluates to the sum of a given numerical property across a collection, excluding `null` values.|

> Example:
> These examples all query for projects containing to-do items that meet
this criteria:
>
> - Projects with average item priority above 5.
> - Projects with an item whose priority is less than 5.
> - Projects with an item whose priority is greater than 5.
> - Projects with more than 5 items.
> - Projects with long-running items.
>
> ```javascript
> var priorityNum = 5;
>
>   "items.@avg.priority > $0", priorityNum
>
>   "items.@max.priority < $0", priorityNum
>
>   "items.@min.priority > $0", priorityNum
>
>   "items.@count > $0", 5
>
>   "items.@sum.progressMinutes > $0", 100
>
> ```
>

## Collection Operators
A **collection operator** lets you query list properties within a collection of objects.
Collection operators filter a collection by applying a predicate
to every element of a given list property of the object.
If the predicate returns true, the object is included in the output collection.

|Operator|Description|
| --- | --- |
|`ALL`|Returns objects where the predicate evaluates to `true` for all objects in the collection.|
|`ANY`, `SOME`|Returns objects where the predicate evaluates to `true` for any objects in the collection.|
|`NONE`|Returns objects where the predicate evaluates to false for all objects in the collection.|

> Example:
> This example uses collection operators to find projects that contain to-do items
matching certain criteria:
>
> ```js
>   // Projects with no complete items.
>   "NONE items.isComplete == $0", true
>
>   // Projects that contain a item with priority 10
>   "ANY items.priority == $0", 10
>
>   // Projects that only contain completed items
>   "ALL items.isComplete == $0", true
>
>   // Projects with at least one item assigned to either Alex or Ali
>   "ANY items.assignee IN { $0 , $1 }", "Alex", "Ali"
>
>   // Projects with no items assigned to either Alex or Ali
>   "NONE items.assignee IN { $0 , $1 }", "Alex", "Ali"
>
> ```
>

## List Comparisons
You can use comparison operators and
collection operators to filter based
on lists of data.

You can compare any type of valid list. This includes:

- collections of Realm objects, which let you filter against other data
in the realm. `"oid(631a072f75120729dc9223d9) IN items.id"
`
- lists defined directly in the query, which let you filter against
static data. You define static lists as a comma-separated list of
literal values enclosed in opening (`{`) and closing (`}`) braces. `"priority IN {0, 1, 2}"
`
- native list objects passed in a parameterized expression, which let you pass application data
directly to your queries. `const ids = [
  new BSON.ObjectId("631a072f75120729dc9223d9"),
  new BSON.ObjectId("631a0737c98f89f5b81cd24d"),
  new BSON.ObjectId("631a073c833a34ade21db2b2"),
];
const parameterizedQuery = realm.objects("Item").filtered("id IN $0", ids);
`

If you do not define a collection operator, a list expression defaults
to the `ANY` operator.

> Example:
> These two list queries are equivalent:
>
> - `age == ANY {18, 21}`
> - `age == {18, 21}`
>
> Both of these queries return objects with an age property equal to
either 18 or 21. You could also do the opposite by returning objects
only if the age is not equal to either 18 or 21:
>
> - `age == NONE {18, 21}`
>

The following table includes examples that illustrate how collection
operators interact with lists and comparison operators:

|Expression|Match?|Reason|
| --- | --- | --- |
|`ANY {1, 2, 3} > ALL {1, 2}`|true|A value on the left (3) is greater than some value on the right (both 1 and 2)|
|`ANY {1, 2, 3} == NONE {1, 2}`|true|3 does not match either of 1 or 2|
|`ANY {4, 8} == ANY {5, 9, 11}`|false|Neither 4 nor 8 matches any value on the right (5, 9 or 11)|
|`ANY {1, 2, 7} <= NONE {1, 2}`|true|A value on the left (7) is not less than or equal to both 1 and 2|
|`ALL {1, 2} IN ANY {1, 2, 3}`|true|Every value on the left (1 and 2) is equal to 1, 2 or 3|
|`ALL {3, 1, 4, 3} == NONE {1, 2}`|false|1 matches a value in the NONE list (1 or 2)|
|`ALL {} in ALL {1, 2}`|true|An empty list matches all lists|
|`NONE {1, 2, 3, 12} > ALL {5, 9, 11}`|false|12 is bigger than all values on the right (5, 9, and 11)|
|`NONE {4, 8} > ALL {5, 9, 11}`|true|4 and 8 are both less than some value on the right (5, 9, or 11)|
|`NONE {0, 1} < NONE {1, 2}`|true|0 and 1 are both less than none of 1 and 2|

## Full Text Search
You can use RQL to query on properties that have a full-text search (FTS)
annotation. FTS supports boolean match word searches, rather than searches for relevance.
For information on enabling FTS on a property, see the FTS documentation for
your SDK:

- Flutter SDK
- Kotlin SDK
- .NET SDK
- Node.js SDK
- React Native SDK
- Swift SDK does not yet support Full-Text Search.

To query these properties, use the `TEXT` predicate in your query.

You can search for entire words or phrases, or limit your results with the following characters:

- Exclude results for a word by placing the `-` character in front of the word.
- Specify prefixes by placing the `*` character at the end of a prefix. Suffix
searching is not currently supported.

In the following example, we query the `Item.name` property:

```js
    // Filter for items with 'write' in the name
    "name TEXT $0", "write"

    // Find items with 'write' but not 'tests' using '-'
    "name TEXT $0", "write -tests"

    // Find items starting with 'wri-' using '*'
    "name TEXT $0", "wri*"

```

### Full-Text Search Tokenizer Details
Full-Text Search (FTS) indexes support:

- Tokens are diacritics- and case-insensitive.
- Tokens can only consist of characters from ASCII and the Latin-1 supplement (western languages).
All other characters are considered whitespace.
- Words split by a hyphen (-) are split into two tokens.  For example, `full-text`
splits into `full` and `text`.

## Geospatial Queries
You can query against geospatial data using the `geoWithin` operator.
The `geoWithin` operator takes the latitude/longitude pair in a custom
embedded object's `coordinates` property and a geospatial shape. The
operator checks whether the `coordinates` point is contained within the
geospatial shape.

The following geospatial shapes are supported for querying:

- `GeoCircle`
- `GeoBox`
- `GeoPolygon`

To query geospatial data:

1. Create an object with a property containing the embedded geospatial data.
2. Define the geospatial shape to set the boundary for the query.
3. Query using the `geoWithin` RQL operator.

In the following query, we are checking that the coordinates of the embedded
`location` property are contained within the `GeoCircle` shape, `smallCircle`:

```js
"location geoWithin $0", smallCircle

```

For more information on defining geospatial shapes and objects with embedded geospatial data,
see the geospatial documentation for your SDK.

## Backlink Queries
A backlink is an inverse relationship link that lets you look up objects
that reference another object. Backlinks use the to-one and to-many
relationships defined in your object schemas but reverse the direction.
Every relationship that you define in your schema implicitly has a
corresponding backlink.

You can access backlinks in queries using the
`@links.<ObjectType>.<PropertyName>` syntax, where `<ObjectType>`
and `<PropertyName>` refer to a specific property on an object type
that references the queried object type.

```js
// Find items that belong to a project with a quota greater than 10 (@links)
"@links.Project.items.quota > 10"

```

You can also define a `linkingObjects` property to explicitly include
the backlink in your data model. This lets you reference the backlink
through an assigned property name using standard dot notation.

```js
// Find items that belong to a project with a quota greater than 10 (LinkingObjects)
"projects.quota > 10"

```

The result of a backlink is treated like a collection and supports
collection operators.

```js
  // Find items where any project that references the item has a quota greater than 0
  "ANY @links.Project.items.quota > 0"
  // Find items where all projects that reference the item have a quota greater than 0
  "ALL @links.Project.items.quota > 0"

```

You can use aggregate operators on the backlink collection.

```js
  // Find items that are referenced by multiple projects
  "projects.@count > 1"
  // Find items that are not referenced by any project
  "@links.Project.items.@count == 0"
  // Find items that belong to a project where the average item has
  // been worked on for at least 5 minutes
  "@links.Project.items.items.@avg.progressMinutes > 10"

```

You can query the count of all relationships that point to an object by
using the `@count` operator directly on `@links`.

```js
// Find items that are not referenced by another object of any type
"@links.@count == 0"

```

## Subqueries
Iterate through list properties with another query using the
`SUBQUERY()` predicate function.

Subqueries are useful for the following scenarios:

- Matching each object in a list property on multiple conditions
- Counting the number of objects that match a subquery

`SUBQUERY()` has the following structure:

```js
SUBQUERY(<collection>, <variableName>, <predicate>)
```

- `collection`: The name of the property to iterate through
- `variableName`: A variable name of the element to use in the subquery
- `predicate`: The subquery predicate.
Use the variable specified by `variableName` to refer to the
currently-iterated element.

A subquery iterates through the given collection and checks the given predicate
against each object in the collection. The predicate can refer to the current
iterated object with the variable name passed to `SUBQUERY()`.

A subquery expression resolves to a list of objects.
Realm only supports the `@count` aggregate operator on the result
of a subquery. This allows you to count how many objects in the subquery
input collection matched the predicate.

You can use the count of the subquery result as you would any other number
in a valid expression. In particular, you can compare the count with the
number `0` to return all matching objects.

> Example:
> The following example shows two subquery filters on a collection of projects.
>
> ```js
>   // Returns projects with items that have not been completed
>   // by a user named Alex.
>   "SUBQUERY(items, $item, $item.isComplete == false AND $item.assignee == 'Alex').@count > 0"
>
>   // Returns the projects where the number of completed items is
>   // greater than or equal to the value of a project's `quota` property.
>   "SUBQUERY(items, $item, $item.isComplete == true).@count >= quota"
>
> ```
>

## Sort, Distinct & Limit
Sort and limit the results collection of your query using additional operators.

|Operator|Description|
| --- | --- |
|`SORT`|Specify the name of the property to compare, and whether to sort by ascending (`ASC`) or descending (`DESC`) order. If you specify multiple SORT fields, you must specify sort order for each field. With multiple sort fields, the query sorts by the first field, and then the second. For example, if you `SORT (priority DESC, name DESC)`, the query returns sorted by priority, and then by name when priority value is the same.|
|`DISTINCT`|Specify a name of the property to compare. Remove duplicates for that property in the results collection. If you specify multiple DISTINCT fields, the query removes duplicates by the first field, and then the second. For example, if you `DISTINCT (name, assignee)`, the query only removes duplicates where the values of both properties are the same.|
|`LIMIT`|Limit the results collection to the specified number.|

> Example:
> Use the query engine's sort, distinct, and limit operators to find to-do items
where the assignee is Ali:
>
> - Sorted by priority in descending order
> - Enforcing uniqueness by name
> - Limiting the results to 5 items
>
> ```javascript
> "assignee == 'Ali' SORT(priority DESC) DISTINCT(name) LIMIT(5)"
>
> ```
>
