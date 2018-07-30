The Realm JavaScript SDK supports querying based on a language inspired by [NSPredicate](https://realm.io/news/nspredicate-cheatsheet/). 

The {@link Realm.Collection#filtered Collection.filtered()} method is used to query a Realm:

```JS
let contacts = realm.objects('Contact');
let friendsPage2 = contacts.filtered('type == "friend" AND name BEGINSWITH "B"');
```

It's possible to filter by linked or child objects with a keypath.

Example:
```JS
let johnsChildren = realm.Object('Contact').filtered('father.name == "John"');
```

Query strings can use numbered (`$0`, `$1`, ...) placeholders. The succeeding parameters contain the values.
Named placeholders are **not** yet supported.

Example:
```JS
let merlots = wines.filtered('variety == $0 && vintage <= $1', 'Merlot', maxYear);
```


### Conditional operators
You can use equality comparison on all property types: 
`==` and `!=` 

Furthermore, the following can be used on numerical types:
`<`, `<=`, `>`, `>=`

Example:
```JS
let oldContacts = realm.objects('Contact').filtered('age > 2');
```

Note that for boolean properties, you should test against `true` or `false`.

Example:
```JS
let women = realm.objects('Contact').filtered('isMale == false');
```

### String operators
For string properties, prefix, suffix, and substring queries are supported by using the `BEGINSWITH`, `ENDSWITH`, `CONTAINS` and `LIKE` operators.

For any string operation you can append `[c]` to the operator to make it case insensitive.

Example:
```JS
let peopleWhoseNameContainsA = realm.objects('Contact').filtered('name CONTAINS[c] "a"');
let Johns = realm.objects('Contact').filtered('name ==[c] "john"');
```

You can do simple wildcard matching with `LIKE` which supports using `?` to match a single character and `*` to match zero or multiple characters.

Example:
```JS
// Matches "John" and "Johnny"
let Johns = realm.objects('Contact').filtered('name LIKE "John*"');
```

### Composition
Use parentheses `()` and the `&&`/`AND` and `||`/`OR` operators to compose queries. You can negate a predicate with `!`/`NOT`.

### Timestamps

Normally queries can be written with variable substitution so that the syntax of dates is taken care of by Realm. However, sometimes it fits better to compose a entirely string based query. In that case the syntax follows the format `YYYY-MM-DD@HH:MM:SS:N` where the `:N` suffix specifies nanoseconds but can be omitted (defaulting to 0). If preferred, a programmatic format is also supported `TSS:NS` which is a literal `T` followed by seconds since epoch, and nanoseconds modifier. In both formats, negative nanoseconds are considered invalid syntax. Timestamps are not quoted like strings. Due to platform limitations, using the first syntax is not supported for dates pre epoch on windows and pre 1901 on other platforms.

```JS
realm.objects('Person').filtered('birthday == 2017-12-04@0:0:0') // readable date omitting nanoseconds (assumes 0)
realm.objects('Person').filtered('birthday == 2015-7-2@14:23:17:233') // readable date including nanoseconds
realm.objects('Person').filtered('birthday == T1435846997:233') // equivalent to above
realm.objects('Person').filtered('birthday == 1970-1-1@0:0:0:0') // epoch is the default non-null Timestamp value
```

### Queries on collections

When objects contain lists you can query into them using the collection operators `ANY`, `ALL` and `NONE`.

Example:
```JS
// Find contacts with one or more teenage friends
let teens = realm.objects('Contact').filtered('ANY friends.age < 14');

// Find contacts where all friends are older than 21
let adults = realm.objects('Contact').filtered('ALL friends.age > 21');
```

You can query on aggregates over properties in the lists using the aggregate operators `.@count`, `.@avg`, `.@min`, `.@max` and `.@sum`.

Example:
```JS
// Find contacts without friends
let lonely = realm.objects('Contact').filtered('friends.@count == 0');

// Find contacts where the average age of their friends is above 40
let adults = realm.objects('Contact').filtered('friends.@avg.age > 40');
```

Subqueries using the `SUBQUERY` operator allows you to filter the lists across multiple parameters while querying them.

Example:
```JS
// Find contacts with friends above 21 in SF
let teens = realm.objects('Contact').filtered('SUBQUERY(friends, $friend, $friend.age > 21 AND $friend.city = "SF").@count > 0');
```

### Backlink queries

Since backlinks are an indirect concept, let's consider a running example with the following models:

```JS
const CarSchema = {
  name: 'Car',
  properties: {
    make:  'string',
    model: 'string',
    price: 'double',
    owner: 'Person',
  }
};
const PersonSchema = {
  name: 'Person',
  properties: {
    name: 'string',
    cars: { type: 'linkingObjects', objectType: 'Car', property: 'owner' }, // backlinks of Car.owner, this property is optional
  }
};
```

Links are properties which are an object type, for example `Car.owner` is a forward link. You can query through a forward link chain by following the link property names (see query 1 in the example below). The query is self descriptive.
What if we want to know which People own a certain type of car? We can find this using backlinks. Backlink is a term used to describe following a relationship backwards. This backwards relationship always exists for every link property and it is not required to name it in the model. We can use the named backlink (query 2 in the example below) just like we did with a forward relationship. However, you can also query backlinks without a name by fully describing the forward relationship using the ` @links.ClassName.PropertyName` syntax (query 3 in the example below). Regardless of whether they are named or not, backlinks can be treated like a collection. This means that you can use all the collection operators as usual (queries 4-7 in the example below). In addition to the collection operators, there is special syntax to allow querying the count of all backlink relationships (query 8 in the example below) which is different than querying for the backlink count on a specific relationship (query 5 in the example below) unless there is only one incoming link in total. Although there is no functional difference between using named versus unnamed backlinks, the readability of the query syntax is affected so it is normally preferred to name the backlink with a `linkingObject` property when possible.

Examples:
```JS
// Query 1) Find all cars which have an owner named 'bob' (case insensitive equality)
realm.objects('Car').filtered('owner.name ==[c] "bob"')
// Query 2) Find which people own a certain type of car by using a named backlink (any is implied)
realm.objects('Person').filtered('cars.make ==[c] "honda"')
// Query 3) Find which people own a certain type of car by using the unnamed backlink syntax
realm.objects('Person').filtered('@links.Car.owner.make ==[c] "honda"')
// Query 4) collection aggregate operator example using the unnamed backlink syntax
realm.objects('Person').filtered('@links.Car.owner.@avg.price > 30000')
// Query 5) Find people who have 3 cars using the named backlink syntax
realm.objects('Person').filtered('cars.@count == 3')
// Query 6) Find people who own a Honda which has a price > 30000 using the unnamed backlink syntax with SUBQUERY
realm.objects('Person').filtered('SUBQUERY(@links.Car.owner, $x, $x.make ==[c] "honda" && $x.price > 30000).@count > 1')
// Query 7) Find people who own only a specific type of car
realm.objects('Person').filtered('ALL @links.Car.owner.make ==[c] "honda"')
// Query 8) Find people with no incoming links (across all linked properties)
realm.objects('Person').filtered('@links.@count == 0')
```
