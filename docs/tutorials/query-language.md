The Realm JavaScript SDK supports querying based on a language by [NSPredicate](https://realm.io/news/nspredicate-cheatsheet/). There are differences though.

You query your Realm using the {@link Realm.Collection#filtered Collection.filtered()} method:

```JS
let dogs = realm.objects('Dog');
let tanDogs = dogs.filtered('color = "tan" AND name BEGINSWITH "B"');
```
