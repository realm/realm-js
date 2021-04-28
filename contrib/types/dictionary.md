# Dictionaries 

## Behavioral Description
The idea behind dictionaries is to provide a key/value store to store data in an flexible way, similar to the schemaless behaviour observed in MongoDB. To accomplish this we map the Realm dictionaries with the [Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object) structure. 

## Getting Started

### Schema Definition

```js
const dictschema = {
    name: "dictionary",
    properties: {
        home: "{}"
    }
}
``` 
> We create a dictionary called ``home``. 

Everything here is very similar to your typical schema, the main difference is the property for dictionaries which is ``{}`` resembling the Javascript Objects notation.



