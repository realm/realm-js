# Field Types - Node.js SDK
Realm supports the following field data types:

- `bool` maps to the JavaScript [Boolean](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean) type
- `int` maps to the JavaScript [Number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number) type. Internally, Realm stores `int` with 64 bits.
- `float` maps to the JavaScript [Number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number) type. Internally, Realm stores `float` with 32 bits.
- `double` maps to the JavaScript [Number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number) type. Internally, Realm stores `double` with 64 bits.
- `string` maps to the JavaScript [String](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean) type.
- `decimal128` for high precision numbers.
- `objectId` maps to BSON [ObjectId](https://www.mongodb.com/docs/manual/reference/method/ObjectId/) type.
- `data` maps to the JavaScript [ArrayBuffer](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer) type.
- `date` maps to the JavaScript [Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date) type.
- `list` maps to the JavaScript [Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array) type. You can also specify that a field contains a list of primitive value types by appending `[]` to the type name.
- `linkingObjects` is a special type used to define an inverse relationship.
- `dictionary` used to manage a collection of unique String keys paired with values. The `Dictionary` data type is available in the [realm-js@10.5.0 release](https://github.com/realm/realm-js/releases/tag/v10.5.0).
- `set` is based on the JavaScript [Set](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set) type. `Realm Set` is available in the [realm-js@10.5.0 release](https://github.com/realm/realm-js/releases/tag/v10.5.0).
- `mixed` is a property type that can hold different data types. The `Mixed` data type is available in the [realm-js@10.5.0 release](https://github.com/realm/realm-js/releases/tag/v10.5.0).
- `uuid` is a universally unique identifier from `Realm.BSON`. The `UUID` data type is available in the [realm-js@10.5.0 release](https://github.com/realm/realm-js/releases/tag/v10.5.0).
- `counter` functions as a logical counter when working with synchronized databases. The `counter` data type and its associated class are available in the [realm-js@12.10.0 release](https://github.com/realm/realm-js/releases/tag/v12.10.0).
