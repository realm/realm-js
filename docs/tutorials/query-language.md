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


### Relational operators
You can use equality comparison on all property types: 
`==` and `!=` 

Furthermore, the following can be used on numerical types:
`<`, `<=`, `>`, `>=`

Example:
```JS
let oldContacts = realm.objects('Contact').filtered('age > 2');
```

Note that for boolean properties, you should test against the expected keyword.

Example:
```JS
let women = realm.objects('Contact').filtered('isMale == false');
```

### String operators
For string properties, prefix, suffix, and substring queries are supported by using the `BEGINSWITH`, `ENDSWITH`, and `CONTAINS` operators.

For any string operation you can append `[c]` to the operator to make it case insensitive.

Example:
```JS
let peopleWhoseNameContainsA = realm.objects('Contact').filtered('name CONTAINS[c] "a"');
let Johns = realm.objects('Contact').filtered('name ==[c] "john"');
```

### Composition
Use parentheses and the `&&`/`AND` and `||`/`OR` operators to compose queries. You can negate a predicate with `!`/`NOT`.

