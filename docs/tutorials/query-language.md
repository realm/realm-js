The Realm JavaScript SDK supports querying based on a language inspired by [NSPredicate](https://realm.io/news/nspredicate-cheatsheet/). 

You query your Realm using the {@link Realm.Collection#filtered Collection.filtered()} method:

```JS
let dogs = realm.objects('Dog');
let tanDogs = dogs.filtered('color == "tan" AND name BEGINSWITH "B"');
```

You can filter by linked or child objects with a keypath.

Example:
```JS
let johnsDogs = realm.Object('Dog').filtered('owner.name == "John"');
```

You can use numbered (`$0`, `$1`, ...) placeholders in your query string, using the succeeding parameters as the values.
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
let puppies = realm.objects('Dog').filtered('age < 2');
```

### String operators
With strings, besides from the normal equality operators, you can use `BEGINSWITH`, `ENDSWITH` and `CONTAINS`.

For any string operation, you can append `[c]` to the operator to make it case insensitive.

Example:
```JS
let peopleWhoseNameContainsA = realm.objects('Person').filtered('name CONTAINS[c] "a"');
let Johns = realm.objects('Person').filtered('name ==[c] "john"');
```

### Composition
You can use parentheses and the `&&`/`AND` and `||`/`OR` operators to compose queries. You can negate a predicate with `!`/`NOT`.

