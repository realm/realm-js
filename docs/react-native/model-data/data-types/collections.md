# Collections - React Native SDK
Realm has several types to represent groups of objects,
which we call **collections**. A collection is an object that contains
zero or more instances of one Realm type.

You can filter and sort any collection using Realm's
query engine. Collections are
live, so they always reflect the current state
of the realm instance on the current thread. You can also
listen for changes in the collection by subscribing to collection
notifications.

## Results
A `Results` collection represents the
lazily-evaluated results of a query operation. Results are immutable:
you cannot add or remove elements to or from the results collection.
Results have an associated query that determines their contents.

## Lists
A `List` represents a to-many
relationship between two Realm
types. Lists are mutable: within a write transaction, you can add and
remove elements to and from a list. Lists are not associated with a
query and are declared as a property of an object model.

> Seealso:
> To-Many Relationships
>

## Results are Lazily Evaluated
Realm only runs a query when you request the
results of that query. This lazy evaluation enables you to write
elegant, highly-performant code for handling large data sets and complex
queries.

## Collections are Live
Like live objects, Realm collections
are usually **live**:

- Live results collections always reflect the current results of the associated query.
- Live lists always reflect the current state of the relationship on the realm instance.

A collection is **not** live when:

- it is a results collection that you are iterating through using a [for..in](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for...in) or [for..of](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for...of) statement. Both statements will continue to iterate through objects in the collection even if you have deleted or modified the collection's objects to exclude them from the filter that produced the results collection.
- the collection is a frozen `Results.snapshot()`.

Combined with collection notifications, live collections enable
reactive code. For example, suppose your view displays the
results of a query. You can keep a reference to the results
collection in your view class, then read the results
collection as needed without having to refresh it or
validate that it is up-to-date.

> **IMPORTANT:**
> Since results update themselves automatically, do not
store the positional index of an object in the collection
or the count of objects in a collection. The stored index
or count value could be outdated by the time you use
it.
>

## Working With Collections
### Limiting Query Results
As a result of lazy evaluation, you do not need any special
mechanism to limit query results with Realm. For example, if
your query matches thousands of objects, but you only want
to load the first ten, access only the first ten
elements of the results collection.

### Pagination
Thanks to lazy evaluation, the common task of pagination
becomes quite simple. For example, suppose you have a
results collection associated with a query that matches
thousands of objects in your realm. You display one hundred
objects per page. To advance to any page, simply access the
elements of the results collection starting at the index
that corresponds to the target page.

## Summary
- A Realm **collection** is a homogenous container of zero
or more instances of one
Realm type.
- There are two main kinds of collection: **lists** and **results**.
Lists define the to-many relationships
of your Realm types, while results represent the
lazily-loaded output of a read operation.
- Lazy evaluation of results collections means there is no need to
design a special query to get limited or paginated results. Perform
the query and read from the results collection as needed.
- Data in Realm is *live*, which means that an object always reflects its most recent saved state.
