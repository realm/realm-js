---
id: "Realm.Set"
title: "Interface: Set<T>"
sidebar_label: "Realm.Set"
custom_edit_url: null
---

[Realm](../namespaces/Realm).Set

Set

**`see`** { @link https://realm.io/docs/javascript/latest/api/Realm.Set.html }

## Type parameters

| Name |
| :------ |
| `T` |

## Hierarchy

- [`Collection`](../namespaces/Realm#collection)<`T`\>

  ↳ **`Set`**

## Properties

### length

• `Readonly` **length**: `number`

Gets the length of the array. This is a number one higher than the highest element defined in an array.

#### Inherited from

Collection.length

___

### optional

• `Readonly` **optional**: `boolean`

#### Inherited from

Collection.optional

___

### size

• `Readonly` **size**: `number`

___

### type

• `Readonly` **type**: `string`

#### Inherited from

Collection.type

## Methods

### [iterator]

▸ **[iterator]**(): `IterableIterator`<`T`\>

Iterator of values in the array.

#### Returns

`IterableIterator`<`T`\>

#### Inherited from

Collection.\_\_@iterator@49443

___

### add

▸ **add**(`object`): [`Set`](../namespaces/Realm#set)<`T`\>

Add a new value to the Set

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `object` | `T` | Value to add to the Set |

#### Returns

[`Set`](../namespaces/Realm#set)<`T`\>

The Realm.Set`<T>` itself, after adding the new value

___

### addListener

▸ **addListener**(`callback`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `callback` | [`CollectionChangeCallback`](../namespaces/Realm#collectionchangecallback)<`T`\> |

#### Returns

`void`

void

#### Inherited from

Collection.addListener

___

### avg

▸ **avg**(`property?`): `number`

#### Parameters

| Name | Type |
| :------ | :------ |
| `property?` | `string` |

#### Returns

`number`

#### Inherited from

Collection.avg

___

### clear

▸ **clear**(): `void`

Clear all values from the Set

#### Returns

`void`

___

### concat

▸ **concat**(...`items`): `T`[]

Combines two or more arrays.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `...items` | `ConcatArray`<`T`\>[] | Additional items to add to the end of array1. |

#### Returns

`T`[]

#### Inherited from

Collection.concat

▸ **concat**(...`items`): `T`[]

Combines two or more arrays.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `...items` | (`T` \| `ConcatArray`<`T`\>)[] | Additional items to add to the end of array1. |

#### Returns

`T`[]

#### Inherited from

Collection.concat

___

### delete

▸ **delete**(`object`): `boolean`

Delete a value from the Set

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `object` | `T` | Value to delete from the Set |

#### Returns

`boolean`

Boolean:  true if the value existed in the Set prior to deletion, false otherwise

___

### description

▸ **description**(): `string`

#### Returns

`string`

#### Inherited from

Collection.description

___

### entries

▸ **entries**(): `IterableIterator`<[`number`, `T`]\>

Returns an iterable of key, value pairs for every entry in the array

#### Returns

`IterableIterator`<[`number`, `T`]\>

#### Inherited from

Collection.entries

___

### every

▸ **every**<`S`\>(`predicate`, `thisArg?`): this is readonly S[]

Determines whether all the members of an array satisfy the specified test.

#### Type parameters

| Name |
| :------ |
| `S` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `predicate` | (`value`: `T`, `index`: `number`, `array`: readonly `T`[]) => value is S | A function that accepts up to three arguments. The every method calls the predicate function for each element in the array until the predicate returns a value which is coercible to the Boolean value false, or until the end of the array. |
| `thisArg?` | `any` | An object to which the this keyword can refer in the predicate function. If thisArg is omitted, undefined is used as the this value. |

#### Returns

this is readonly S[]

#### Inherited from

Collection.every

▸ **every**(`predicate`, `thisArg?`): `boolean`

Determines whether all the members of an array satisfy the specified test.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `predicate` | (`value`: `T`, `index`: `number`, `array`: readonly `T`[]) => `unknown` | A function that accepts up to three arguments. The every method calls the predicate function for each element in the array until the predicate returns a value which is coercible to the Boolean value false, or until the end of the array. |
| `thisArg?` | `any` | An object to which the this keyword can refer in the predicate function. If thisArg is omitted, undefined is used as the this value. |

#### Returns

`boolean`

#### Inherited from

Collection.every

___

### filter

▸ **filter**<`S`\>(`predicate`, `thisArg?`): `S`[]

Returns the elements of an array that meet the condition specified in a callback function.

#### Type parameters

| Name |
| :------ |
| `S` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `predicate` | (`value`: `T`, `index`: `number`, `array`: readonly `T`[]) => value is S | A function that accepts up to three arguments. The filter method calls the predicate function one time for each element in the array. |
| `thisArg?` | `any` | An object to which the this keyword can refer in the predicate function. If thisArg is omitted, undefined is used as the this value. |

#### Returns

`S`[]

#### Inherited from

Collection.filter

▸ **filter**(`predicate`, `thisArg?`): `T`[]

Returns the elements of an array that meet the condition specified in a callback function.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `predicate` | (`value`: `T`, `index`: `number`, `array`: readonly `T`[]) => `unknown` | A function that accepts up to three arguments. The filter method calls the predicate function one time for each element in the array. |
| `thisArg?` | `any` | An object to which the this keyword can refer in the predicate function. If thisArg is omitted, undefined is used as the this value. |

#### Returns

`T`[]

#### Inherited from

Collection.filter

___

### filtered

▸ **filtered**(`query`, ...`arg`): [`Results`](../namespaces/Realm#results)<`T`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `query` | `string` |
| `...arg` | `any`[] |

#### Returns

[`Results`](../namespaces/Realm#results)<`T`\>

Results

#### Inherited from

Collection.filtered

___

### find

▸ **find**<`S`\>(`predicate`, `thisArg?`): `S`

Returns the value of the first element in the array where predicate is true, and undefined
otherwise.

#### Type parameters

| Name |
| :------ |
| `S` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `predicate` | (`value`: `T`, `index`: `number`, `obj`: readonly `T`[]) => value is S | find calls predicate once for each element of the array, in ascending order, until it finds one where predicate returns true. If such an element is found, find immediately returns that element value. Otherwise, find returns undefined. |
| `thisArg?` | `any` | If provided, it will be used as the this value for each invocation of predicate. If it is not provided, undefined is used instead. |

#### Returns

`S`

#### Inherited from

Collection.find

▸ **find**(`predicate`, `thisArg?`): `T`

#### Parameters

| Name | Type |
| :------ | :------ |
| `predicate` | (`value`: `T`, `index`: `number`, `obj`: readonly `T`[]) => `unknown` |
| `thisArg?` | `any` |

#### Returns

`T`

#### Inherited from

Collection.find

___

### findIndex

▸ **findIndex**(`predicate`, `thisArg?`): `number`

Returns the index of the first element in the array where predicate is true, and -1
otherwise.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `predicate` | (`value`: `T`, `index`: `number`, `obj`: readonly `T`[]) => `unknown` | find calls predicate once for each element of the array, in ascending order, until it finds one where predicate returns true. If such an element is found, findIndex immediately returns that element index. Otherwise, findIndex returns -1. |
| `thisArg?` | `any` | If provided, it will be used as the this value for each invocation of predicate. If it is not provided, undefined is used instead. |

#### Returns

`number`

#### Inherited from

Collection.findIndex

___

### flat

▸ **flat**<`A`, `D`\>(`depth?`): `FlatArray`<`A`, `D`\>[]

Returns a new array with all sub-array elements concatenated into it recursively up to the
specified depth.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `A` | `A` |
| `D` | extends `number` = ``1`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `depth?` | `D` | The maximum recursion depth |

#### Returns

`FlatArray`<`A`, `D`\>[]

#### Inherited from

Collection.flat

___

### flatMap

▸ **flatMap**<`U`, `This`\>(`callback`, `thisArg?`): `U`[]

Calls a defined callback function on each element of an array. Then, flattens the result into
a new array.
This is identical to a map followed by flat with depth 1.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `U` | `U` |
| `This` | `undefined` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `callback` | (`value`: `T`, `index`: `number`, `array`: `T`[]) => `U` \| readonly `U`[] | A function that accepts up to three arguments. The flatMap method calls the callback function one time for each element in the array. |
| `thisArg?` | `This` | An object to which the this keyword can refer in the callback function. If thisArg is omitted, undefined is used as the this value. |

#### Returns

`U`[]

#### Inherited from

Collection.flatMap

___

### forEach

▸ **forEach**(`callbackfn`, `thisArg?`): `void`

Performs the specified action for each element in an array.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `callbackfn` | (`value`: `T`, `index`: `number`, `array`: readonly `T`[]) => `void` | A function that accepts up to three arguments. forEach calls the callbackfn function one time for each element in the array. |
| `thisArg?` | `any` | An object to which the this keyword can refer in the callbackfn function. If thisArg is omitted, undefined is used as the this value. |

#### Returns

`void`

#### Inherited from

Collection.forEach

___

### has

▸ **has**(`object`): `boolean`

Check for existence of a value in the Set

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `object` | `T` | Value to search for in the Set |

#### Returns

`boolean`

Boolean: true if the value exists in the Set, false otherwise

___

### includes

▸ **includes**(`searchElement`, `fromIndex?`): `boolean`

Determines whether an array includes a certain element, returning true or false as appropriate.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `searchElement` | `T` | The element to search for. |
| `fromIndex?` | `number` | The position in this array at which to begin searching for searchElement. |

#### Returns

`boolean`

#### Inherited from

Collection.includes

___

### indexOf

▸ **indexOf**(`searchElement`, `fromIndex?`): `number`

Returns the index of the first occurrence of a value in an array.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `searchElement` | `T` | The value to locate in the array. |
| `fromIndex?` | `number` | The array index at which to begin the search. If fromIndex is omitted, the search starts at index 0. |

#### Returns

`number`

#### Inherited from

Collection.indexOf

___

### isEmpty

▸ **isEmpty**(): `boolean`

#### Returns

`boolean`

boolean

#### Inherited from

Collection.isEmpty

___

### isValid

▸ **isValid**(): `boolean`

#### Returns

`boolean`

boolean

#### Inherited from

Collection.isValid

___

### join

▸ **join**(`separator?`): `string`

Adds all the elements of an array separated by the specified separator string.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `separator?` | `string` | A string used to separate one element of an array from the next in the resulting String. If omitted, the array elements are separated with a comma. |

#### Returns

`string`

#### Inherited from

Collection.join

___

### keys

▸ **keys**(): `IterableIterator`<`number`\>

Returns an iterable of keys in the array

#### Returns

`IterableIterator`<`number`\>

#### Inherited from

Collection.keys

___

### lastIndexOf

▸ **lastIndexOf**(`searchElement`, `fromIndex?`): `number`

Returns the index of the last occurrence of a specified value in an array.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `searchElement` | `T` | The value to locate in the array. |
| `fromIndex?` | `number` | The array index at which to begin the search. If fromIndex is omitted, the search starts at the last index in the array. |

#### Returns

`number`

#### Inherited from

Collection.lastIndexOf

___

### map

▸ **map**<`U`\>(`callbackfn`, `thisArg?`): `U`[]

Calls a defined callback function on each element of an array, and returns an array that contains the results.

#### Type parameters

| Name |
| :------ |
| `U` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `callbackfn` | (`value`: `T`, `index`: `number`, `array`: readonly `T`[]) => `U` | A function that accepts up to three arguments. The map method calls the callbackfn function one time for each element in the array. |
| `thisArg?` | `any` | An object to which the this keyword can refer in the callbackfn function. If thisArg is omitted, undefined is used as the this value. |

#### Returns

`U`[]

#### Inherited from

Collection.map

___

### max

▸ **max**(`property?`): `number` \| `Date`

#### Parameters

| Name | Type |
| :------ | :------ |
| `property?` | `string` |

#### Returns

`number` \| `Date`

#### Inherited from

Collection.max

___

### min

▸ **min**(`property?`): `number` \| `Date`

#### Parameters

| Name | Type |
| :------ | :------ |
| `property?` | `string` |

#### Returns

`number` \| `Date`

#### Inherited from

Collection.min

___

### reduce

▸ **reduce**(`callbackfn`): `T`

Calls the specified callback function for all the elements in an array. The return value of the callback function is the accumulated result, and is provided as an argument in the next call to the callback function.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `callbackfn` | (`previousValue`: `T`, `currentValue`: `T`, `currentIndex`: `number`, `array`: readonly `T`[]) => `T` | A function that accepts up to four arguments. The reduce method calls the callbackfn function one time for each element in the array. |

#### Returns

`T`

#### Inherited from

Collection.reduce

▸ **reduce**(`callbackfn`, `initialValue`): `T`

#### Parameters

| Name | Type |
| :------ | :------ |
| `callbackfn` | (`previousValue`: `T`, `currentValue`: `T`, `currentIndex`: `number`, `array`: readonly `T`[]) => `T` |
| `initialValue` | `T` |

#### Returns

`T`

#### Inherited from

Collection.reduce

▸ **reduce**<`U`\>(`callbackfn`, `initialValue`): `U`

Calls the specified callback function for all the elements in an array. The return value of the callback function is the accumulated result, and is provided as an argument in the next call to the callback function.

#### Type parameters

| Name |
| :------ |
| `U` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `callbackfn` | (`previousValue`: `U`, `currentValue`: `T`, `currentIndex`: `number`, `array`: readonly `T`[]) => `U` | A function that accepts up to four arguments. The reduce method calls the callbackfn function one time for each element in the array. |
| `initialValue` | `U` | If initialValue is specified, it is used as the initial value to start the accumulation. The first call to the callbackfn function provides this value as an argument instead of an array value. |

#### Returns

`U`

#### Inherited from

Collection.reduce

___

### reduceRight

▸ **reduceRight**(`callbackfn`): `T`

Calls the specified callback function for all the elements in an array, in descending order. The return value of the callback function is the accumulated result, and is provided as an argument in the next call to the callback function.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `callbackfn` | (`previousValue`: `T`, `currentValue`: `T`, `currentIndex`: `number`, `array`: readonly `T`[]) => `T` | A function that accepts up to four arguments. The reduceRight method calls the callbackfn function one time for each element in the array. |

#### Returns

`T`

#### Inherited from

Collection.reduceRight

▸ **reduceRight**(`callbackfn`, `initialValue`): `T`

#### Parameters

| Name | Type |
| :------ | :------ |
| `callbackfn` | (`previousValue`: `T`, `currentValue`: `T`, `currentIndex`: `number`, `array`: readonly `T`[]) => `T` |
| `initialValue` | `T` |

#### Returns

`T`

#### Inherited from

Collection.reduceRight

▸ **reduceRight**<`U`\>(`callbackfn`, `initialValue`): `U`

Calls the specified callback function for all the elements in an array, in descending order. The return value of the callback function is the accumulated result, and is provided as an argument in the next call to the callback function.

#### Type parameters

| Name |
| :------ |
| `U` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `callbackfn` | (`previousValue`: `U`, `currentValue`: `T`, `currentIndex`: `number`, `array`: readonly `T`[]) => `U` | A function that accepts up to four arguments. The reduceRight method calls the callbackfn function one time for each element in the array. |
| `initialValue` | `U` | If initialValue is specified, it is used as the initial value to start the accumulation. The first call to the callbackfn function provides this value as an argument instead of an array value. |

#### Returns

`U`

#### Inherited from

Collection.reduceRight

___

### removeAllListeners

▸ **removeAllListeners**(): `void`

#### Returns

`void`

void

#### Inherited from

Collection.removeAllListeners

___

### removeListener

▸ **removeListener**(`callback`): `void`

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `callback` | [`CollectionChangeCallback`](../namespaces/Realm#collectionchangecallback)<`T`\> | this is the callback to remove |

#### Returns

`void`

void

#### Inherited from

Collection.removeListener

___

### slice

▸ **slice**(`start?`, `end?`): `T`[]

Returns a section of an array.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `start?` | `number` | The beginning of the specified portion of the array. |
| `end?` | `number` | The end of the specified portion of the array. This is exclusive of the element at the index 'end'. |

#### Returns

`T`[]

#### Inherited from

Collection.slice

___

### snapshot

▸ **snapshot**(): [`Results`](../namespaces/Realm#results)<`T`\>

#### Returns

[`Results`](../namespaces/Realm#results)<`T`\>

Results

#### Inherited from

Collection.snapshot

___

### some

▸ **some**(`predicate`, `thisArg?`): `boolean`

Determines whether the specified callback function returns true for any element of an array.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `predicate` | (`value`: `T`, `index`: `number`, `array`: readonly `T`[]) => `unknown` | A function that accepts up to three arguments. The some method calls the predicate function for each element in the array until the predicate returns a value which is coercible to the Boolean value true, or until the end of the array. |
| `thisArg?` | `any` | An object to which the this keyword can refer in the predicate function. If thisArg is omitted, undefined is used as the this value. |

#### Returns

`boolean`

#### Inherited from

Collection.some

___

### sorted

▸ **sorted**(`reverse?`): [`Results`](../namespaces/Realm#results)<`T`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `reverse?` | `boolean` |

#### Returns

[`Results`](../namespaces/Realm#results)<`T`\>

#### Inherited from

Collection.sorted

▸ **sorted**(`descriptor`): [`Results`](../namespaces/Realm#results)<`T`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `descriptor` | [`SortDescriptor`](../namespaces/Realm#sortdescriptor)[] |

#### Returns

[`Results`](../namespaces/Realm#results)<`T`\>

#### Inherited from

Collection.sorted

▸ **sorted**(`descriptor`, `reverse?`): [`Results`](../namespaces/Realm#results)<`T`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `descriptor` | `string` |
| `reverse?` | `boolean` |

#### Returns

[`Results`](../namespaces/Realm#results)<`T`\>

#### Inherited from

Collection.sorted

___

### sum

▸ **sum**(`property?`): `number`

#### Parameters

| Name | Type |
| :------ | :------ |
| `property?` | `string` |

#### Returns

`number`

#### Inherited from

Collection.sum

___

### toJSON

▸ **toJSON**(): `any`[]

#### Returns

`any`[]

An object for JSON serialization.

#### Inherited from

Collection.toJSON

___

### toLocaleString

▸ **toLocaleString**(): `string`

Returns a string representation of an array. The elements are converted to string using their toLocaleString methods.

#### Returns

`string`

#### Inherited from

Collection.toLocaleString

___

### toString

▸ **toString**(): `string`

Returns a string representation of an array.

#### Returns

`string`

#### Inherited from

Collection.toString

___

### values

▸ **values**(): `IterableIterator`<`T`\>

Returns an iterable of values in the array

#### Returns

`IterableIterator`<`T`\>

#### Inherited from

Collection.values
