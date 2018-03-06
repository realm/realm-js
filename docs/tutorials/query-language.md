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
Use parentheses and the `&&`/`AND` and `||`/`OR` operators to compose queries. You can negate a predicate with `!`/`NOT`.

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
