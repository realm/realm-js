# Dictionaries

## Description
The idea behind dictionaries is to provide a key/value store to store data in a flexible way, similar to the schemaless behaviour observed in MongoDB. To accomplish this we map the Realm dictionaries with the [Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object) structure.

## Getting Started

### Schema Definition

```js
const CitySchema = {
    name: "City",
    properties: {
        home: "{}"
    }
}
```
> Here we create a dictionary called ``home``.

Everything here is very similar to your typical schema, the main difference is the property for dictionaries which is ``{}`` resembling the Javascript Objects notation.


### Creating Dictionary

```js
let realm = new Realm({schema: [CitySchema]})
realm.write(()=> realm.create(CitySchema.name, { home: {windows:5, doors:3, floor:1, color: 'red'} } ))
```
> This creates a new ``home`` entry in the database.


### Update 

#### Existing Fields

You can use the method ``put`` which is part of the Dictionary object:

```js
let homeModel = realm.objects(DictSchema.name)[0] // We get the model object.
realm.write(() => homeModel.home.put({type:'future-proof' }) )
```

Or you can use the setters of the Dictionary object, for example: 

```js
let red_house = realm.objects(DictSchema.name)[0].home // We get the home Dictionary from Realm Model.
realm.write(() => red_house.color = 'red')
```

#### Adding New Fields

To add new fields you can pass a new object the dictionary field of the Realm Model, like this:

```js
let homeModel = realm.objects(DictSchema.name)[0]
realm.write(() => homeModel.home = {windows:1, doors:1, floor:1, color: 'purple'})
```

you can use the ``put`` method to add new members/fields to the Dictionary, for example:

```js
realm.write(() => homeModel.home.put({state:'flying', type:'future-proof' }))
```

### Handling

Everytime you access the ``home`` field in ``homeModel`` a new object is created, this could behave less performant in certain scenarios. Instead of doing that is recommended that you reference the Dictionary as an Object like this:

```js
// we get the house dictionary from the housemodel object.
let red_house = realm.objects(dictschema.name)[0].home
```

> Now you can treat ``red_house`` as you would do with an object.


Now you can perform operations like you would do with any JS Object:

```js
Object.keys(red_house) // Will return all the keys from the DB.
Object.values(red_house) // Will return all the values from the DB.
let {doors} = red_house // Get the door field from the DB.
```

Or you can transform the Dictionary object into a JavaScript non-realm-backed Object:

```js
//Makes a new object and copy the members of the home Dictionary.
let my_pure_house_object = Object.assign({}, red_house)
```

> This creates a detached object, meaning that data is no longer backed by Realm. This is good if you want to deal with an independent copy of a Dictionary.

### Remove

The ``remove`` methods delete members of the Dictionary and works by passing an Array with the fields you want to delete:

```js
realm.write(()=> {  red_home.remove( [ 'style', 'gravity' ] )  })
```

To delete all the members:
```js
realm.write(()=> {  red_home.remove( [ Object.keys(red_home) ] )  })
```

### Reference

As mentioned above Dictionaries behave very similar to Javascript Objects, another property they share is the object reference behaviour. So the following behaviour holds true:  

```js
// we get the house dictionary from the housemodel object.
let first_house = realm.objects(DictSchema.name)[0].home
let second_house = first_house

realm.write(()=> {  first_house.remove( ['doors', 'windows'] )  })

// After we delete the following propositions are true:
console.log(first_house === second_house) // the two objects are the same.
```

### Query 

#### Key/Value 

```js
let houses_with_windows = houses.filtered(`home.@keys = "windows" `)
``` 
> To find objects that has `windows` as a key. 

```js
let summer_hill_houses = houses.filtered(`home.@values = "Summerhill St." `)
``` 
> To find objects with a specific value. 

In both cases the query will run against all the Models in a particular collection.  

#### Specific Key/Value 

To target a specific key/value we can construct the following query: 

```js
let summer_hill_houses = houses.filtered(`home['address'] = "Summerhill St."`)
```

### Listeners

This method is very similar to the ones used by other Realm objects, once you have an JS Object of type dictionary you can use ``addListener`` method to listen for Dictionary changes:


```js
house.addListener((dict, chg_set)=>{ })
```

Where:
* ``dict`` is the mutated version of the Dictionary object.
* ``chg_set`` Is an array describing the operations performed in the object.
 - ``deletions`` Number of fields removed.
 - ``insertions`` An array with the keys that have been inserted, empty is no new fields.  
 - ``modifications`` An array with the keys that have been modified, empty is no new fields.  
