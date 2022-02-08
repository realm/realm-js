---
id: "Realm.App.Sync.SubscriptionSet"
title: "Interface: SubscriptionSet"
sidebar_label: "Realm.App.Sync.SubscriptionSet"
custom_edit_url: null
---

[App](../namespaces/Realm.App).[Sync](../namespaces/Realm.App.Sync).SubscriptionSet

Class representing the set of all active flexible sync subscriptions for a Realm
instance.

The server will continuously evaluate the queries that the instance is subscribed to
and will send data that matches them, as well as remove data that no longer does.

The set of subscriptions can only be updated inside a [SubscriptionSet.update](Realm.App.Sync.SubscriptionSet#update) callback,
by calling methods on the corresponding [MutableSubscriptionSet](Realm.App.Sync.MutableSubscriptionSet) instance.

## Hierarchy

- [`BaseSubscriptionSet`](Realm.App.Sync.BaseSubscriptionSet)

  ↳ **`SubscriptionSet`**

## Constructors

### constructor

• **new SubscriptionSet**()

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[constructor](Realm.App.Sync.BaseSubscriptionSet#constructor)

## Properties

### error

• `Readonly` **error**: `string`

**`returns`** If `state` is [Realm.App.Sync.SubscriptionsState.Error](../enums/Realm.App.Sync.SubscriptionsState#error), this will return a `string`
representing why the SubscriptionSet is in an error state. `null` is returned if there is no error.

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[error](Realm.App.Sync.BaseSubscriptionSet#error)

___

### isEmpty

• `Readonly` **isEmpty**: `boolean`

**`returns`** `true` if there are no subscriptions in the set, `false` otherwise.

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[isEmpty](Realm.App.Sync.BaseSubscriptionSet#isempty)

___

### length

• `Readonly` **length**: `number`

Gets the length of the array. This is a number one higher than the highest element defined in an array.

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[length](Realm.App.Sync.BaseSubscriptionSet#length)

___

### state

• `Readonly` **state**: [`SubscriptionsState`](../enums/Realm.App.Sync.SubscriptionsState)

**`returns`** The state of the SubscriptionSet.

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[state](Realm.App.Sync.BaseSubscriptionSet#state)

___

### version

• `Readonly` **version**: `number`

**`returns`** The version of the SubscriptionSet. This is incremented every time an
[update](Realm.App.Sync.SubscriptionSet#update) is applied.

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[version](Realm.App.Sync.BaseSubscriptionSet#version)

## Methods

### [iterator]

▸ **[iterator]**(): `IterableIterator`<[`Subscription`](../classes/Realm.App.Sync.Subscription)\>

Iterator of values in the array.

#### Returns

`IterableIterator`<[`Subscription`](../classes/Realm.App.Sync.Subscription)\>

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[[iterator]](Realm.App.Sync.BaseSubscriptionSet#[iterator])

___

### concat

▸ **concat**(...`items`): [`Subscription`](../classes/Realm.App.Sync.Subscription)[]

Combines two or more arrays.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `...items` | `ConcatArray`<[`Subscription`](../classes/Realm.App.Sync.Subscription)\>[] | Additional items to add to the end of array1. |

#### Returns

[`Subscription`](../classes/Realm.App.Sync.Subscription)[]

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[concat](Realm.App.Sync.BaseSubscriptionSet#concat)

▸ **concat**(...`items`): [`Subscription`](../classes/Realm.App.Sync.Subscription)[]

Combines two or more arrays.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `...items` | ([`Subscription`](../classes/Realm.App.Sync.Subscription) \| `ConcatArray`<[`Subscription`](../classes/Realm.App.Sync.Subscription)\>)[] | Additional items to add to the end of array1. |

#### Returns

[`Subscription`](../classes/Realm.App.Sync.Subscription)[]

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[concat](Realm.App.Sync.BaseSubscriptionSet#concat)

___

### entries

▸ **entries**(): `IterableIterator`<[`number`, [`Subscription`](../classes/Realm.App.Sync.Subscription)]\>

Returns an iterable of key, value pairs for every entry in the array

#### Returns

`IterableIterator`<[`number`, [`Subscription`](../classes/Realm.App.Sync.Subscription)]\>

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[entries](Realm.App.Sync.BaseSubscriptionSet#entries)

___

### every

▸ **every**<`S`\>(`predicate`, `thisArg?`): this is readonly S[]

Determines whether all the members of an array satisfy the specified test.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `S` | extends [`Subscription`](../classes/Realm.App.Sync.Subscription)<`S`\> |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `predicate` | (`value`: [`Subscription`](../classes/Realm.App.Sync.Subscription), `index`: `number`, `array`: readonly [`Subscription`](../classes/Realm.App.Sync.Subscription)[]) => value is S | A function that accepts up to three arguments. The every method calls the predicate function for each element in the array until the predicate returns a value which is coercible to the Boolean value false, or until the end of the array. |
| `thisArg?` | `any` | An object to which the this keyword can refer in the predicate function. If thisArg is omitted, undefined is used as the this value. |

#### Returns

this is readonly S[]

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[every](Realm.App.Sync.BaseSubscriptionSet#every)

▸ **every**(`predicate`, `thisArg?`): `boolean`

Determines whether all the members of an array satisfy the specified test.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `predicate` | (`value`: [`Subscription`](../classes/Realm.App.Sync.Subscription), `index`: `number`, `array`: readonly [`Subscription`](../classes/Realm.App.Sync.Subscription)[]) => `unknown` | A function that accepts up to three arguments. The every method calls the predicate function for each element in the array until the predicate returns a value which is coercible to the Boolean value false, or until the end of the array. |
| `thisArg?` | `any` | An object to which the this keyword can refer in the predicate function. If thisArg is omitted, undefined is used as the this value. |

#### Returns

`boolean`

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[every](Realm.App.Sync.BaseSubscriptionSet#every)

___

### filter

▸ **filter**<`S`\>(`predicate`, `thisArg?`): `S`[]

Returns the elements of an array that meet the condition specified in a callback function.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `S` | extends [`Subscription`](../classes/Realm.App.Sync.Subscription)<`S`\> |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `predicate` | (`value`: [`Subscription`](../classes/Realm.App.Sync.Subscription), `index`: `number`, `array`: readonly [`Subscription`](../classes/Realm.App.Sync.Subscription)[]) => value is S | A function that accepts up to three arguments. The filter method calls the predicate function one time for each element in the array. |
| `thisArg?` | `any` | An object to which the this keyword can refer in the predicate function. If thisArg is omitted, undefined is used as the this value. |

#### Returns

`S`[]

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[filter](Realm.App.Sync.BaseSubscriptionSet#filter)

▸ **filter**(`predicate`, `thisArg?`): [`Subscription`](../classes/Realm.App.Sync.Subscription)[]

Returns the elements of an array that meet the condition specified in a callback function.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `predicate` | (`value`: [`Subscription`](../classes/Realm.App.Sync.Subscription), `index`: `number`, `array`: readonly [`Subscription`](../classes/Realm.App.Sync.Subscription)[]) => `unknown` | A function that accepts up to three arguments. The filter method calls the predicate function one time for each element in the array. |
| `thisArg?` | `any` | An object to which the this keyword can refer in the predicate function. If thisArg is omitted, undefined is used as the this value. |

#### Returns

[`Subscription`](../classes/Realm.App.Sync.Subscription)[]

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[filter](Realm.App.Sync.BaseSubscriptionSet#filter)

___

### find

▸ **find**<`S`\>(`predicate`, `thisArg?`): `S`

Returns the value of the first element in the array where predicate is true, and undefined
otherwise.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `S` | extends [`Subscription`](../classes/Realm.App.Sync.Subscription)<`S`\> |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `predicate` | (`value`: [`Subscription`](../classes/Realm.App.Sync.Subscription), `index`: `number`, `obj`: readonly [`Subscription`](../classes/Realm.App.Sync.Subscription)[]) => value is S | find calls predicate once for each element of the array, in ascending order, until it finds one where predicate returns true. If such an element is found, find immediately returns that element value. Otherwise, find returns undefined. |
| `thisArg?` | `any` | If provided, it will be used as the this value for each invocation of predicate. If it is not provided, undefined is used instead. |

#### Returns

`S`

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[find](Realm.App.Sync.BaseSubscriptionSet#find)

▸ **find**(`predicate`, `thisArg?`): [`Subscription`](../classes/Realm.App.Sync.Subscription)

#### Parameters

| Name | Type |
| :------ | :------ |
| `predicate` | (`value`: [`Subscription`](../classes/Realm.App.Sync.Subscription), `index`: `number`, `obj`: readonly [`Subscription`](../classes/Realm.App.Sync.Subscription)[]) => `unknown` |
| `thisArg?` | `any` |

#### Returns

[`Subscription`](../classes/Realm.App.Sync.Subscription)

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[find](Realm.App.Sync.BaseSubscriptionSet#find)

___

### findByName

▸ **findByName**(`name`): [`Subscription`](../classes/Realm.App.Sync.Subscription)

Find a subscription by name.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `name` | `string` | The name to search for. |

#### Returns

[`Subscription`](../classes/Realm.App.Sync.Subscription)

The named subscription, or `null` if the subscription is not found.

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[findByName](Realm.App.Sync.BaseSubscriptionSet#findbyname)

___

### findByQuery

▸ **findByQuery**<`T`\>(`query`): [`Subscription`](../classes/Realm.App.Sync.Subscription)

Find a subscription by query. Will match both named and unnamed subscriptions.

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `query` | [`Results`](../namespaces/Realm#results)<`T` & [`Object`](../classes/Realm.Object)\> | The query to search for, represented as a [Realm.Results](../namespaces/Realm#results) instance, e.g. `Realm.objects("Cat").filtered("age > 10")`. |

#### Returns

[`Subscription`](../classes/Realm.App.Sync.Subscription)

The subscription with the specified query, or null if the subscription is not found.

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[findByQuery](Realm.App.Sync.BaseSubscriptionSet#findbyquery)

___

### findIndex

▸ **findIndex**(`predicate`, `thisArg?`): `number`

Returns the index of the first element in the array where predicate is true, and -1
otherwise.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `predicate` | (`value`: [`Subscription`](../classes/Realm.App.Sync.Subscription), `index`: `number`, `obj`: readonly [`Subscription`](../classes/Realm.App.Sync.Subscription)[]) => `unknown` | find calls predicate once for each element of the array, in ascending order, until it finds one where predicate returns true. If such an element is found, findIndex immediately returns that element index. Otherwise, findIndex returns -1. |
| `thisArg?` | `any` | If provided, it will be used as the this value for each invocation of predicate. If it is not provided, undefined is used instead. |

#### Returns

`number`

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[findIndex](Realm.App.Sync.BaseSubscriptionSet#findindex)

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

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[flat](Realm.App.Sync.BaseSubscriptionSet#flat)

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
| `callback` | (`value`: [`Subscription`](../classes/Realm.App.Sync.Subscription), `index`: `number`, `array`: [`Subscription`](../classes/Realm.App.Sync.Subscription)[]) => `U` \| readonly `U`[] | A function that accepts up to three arguments. The flatMap method calls the callback function one time for each element in the array. |
| `thisArg?` | `This` | An object to which the this keyword can refer in the callback function. If thisArg is omitted, undefined is used as the this value. |

#### Returns

`U`[]

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[flatMap](Realm.App.Sync.BaseSubscriptionSet#flatmap)

___

### forEach

▸ **forEach**(`callbackfn`, `thisArg?`): `void`

Performs the specified action for each element in an array.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `callbackfn` | (`value`: [`Subscription`](../classes/Realm.App.Sync.Subscription), `index`: `number`, `array`: readonly [`Subscription`](../classes/Realm.App.Sync.Subscription)[]) => `void` | A function that accepts up to three arguments. forEach calls the callbackfn function one time for each element in the array. |
| `thisArg?` | `any` | An object to which the this keyword can refer in the callbackfn function. If thisArg is omitted, undefined is used as the this value. |

#### Returns

`void`

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[forEach](Realm.App.Sync.BaseSubscriptionSet#foreach)

___

### includes

▸ **includes**(`searchElement`, `fromIndex?`): `boolean`

Determines whether an array includes a certain element, returning true or false as appropriate.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `searchElement` | [`Subscription`](../classes/Realm.App.Sync.Subscription) | The element to search for. |
| `fromIndex?` | `number` | The position in this array at which to begin searching for searchElement. |

#### Returns

`boolean`

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[includes](Realm.App.Sync.BaseSubscriptionSet#includes)

___

### indexOf

▸ **indexOf**(`searchElement`, `fromIndex?`): `number`

Returns the index of the first occurrence of a value in an array.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `searchElement` | [`Subscription`](../classes/Realm.App.Sync.Subscription) | The value to locate in the array. |
| `fromIndex?` | `number` | The array index at which to begin the search. If fromIndex is omitted, the search starts at index 0. |

#### Returns

`number`

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[indexOf](Realm.App.Sync.BaseSubscriptionSet#indexof)

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

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[join](Realm.App.Sync.BaseSubscriptionSet#join)

___

### keys

▸ **keys**(): `IterableIterator`<`number`\>

Returns an iterable of keys in the array

#### Returns

`IterableIterator`<`number`\>

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[keys](Realm.App.Sync.BaseSubscriptionSet#keys)

___

### lastIndexOf

▸ **lastIndexOf**(`searchElement`, `fromIndex?`): `number`

Returns the index of the last occurrence of a specified value in an array.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `searchElement` | [`Subscription`](../classes/Realm.App.Sync.Subscription) | The value to locate in the array. |
| `fromIndex?` | `number` | The array index at which to begin the search. If fromIndex is omitted, the search starts at the last index in the array. |

#### Returns

`number`

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[lastIndexOf](Realm.App.Sync.BaseSubscriptionSet#lastindexof)

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
| `callbackfn` | (`value`: [`Subscription`](../classes/Realm.App.Sync.Subscription), `index`: `number`, `array`: readonly [`Subscription`](../classes/Realm.App.Sync.Subscription)[]) => `U` | A function that accepts up to three arguments. The map method calls the callbackfn function one time for each element in the array. |
| `thisArg?` | `any` | An object to which the this keyword can refer in the callbackfn function. If thisArg is omitted, undefined is used as the this value. |

#### Returns

`U`[]

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[map](Realm.App.Sync.BaseSubscriptionSet#map)

___

### reduce

▸ **reduce**(`callbackfn`): [`Subscription`](../classes/Realm.App.Sync.Subscription)

Calls the specified callback function for all the elements in an array. The return value of the callback function is the accumulated result, and is provided as an argument in the next call to the callback function.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `callbackfn` | (`previousValue`: [`Subscription`](../classes/Realm.App.Sync.Subscription), `currentValue`: [`Subscription`](../classes/Realm.App.Sync.Subscription), `currentIndex`: `number`, `array`: readonly [`Subscription`](../classes/Realm.App.Sync.Subscription)[]) => [`Subscription`](../classes/Realm.App.Sync.Subscription) | A function that accepts up to four arguments. The reduce method calls the callbackfn function one time for each element in the array. |

#### Returns

[`Subscription`](../classes/Realm.App.Sync.Subscription)

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[reduce](Realm.App.Sync.BaseSubscriptionSet#reduce)

▸ **reduce**(`callbackfn`, `initialValue`): [`Subscription`](../classes/Realm.App.Sync.Subscription)

#### Parameters

| Name | Type |
| :------ | :------ |
| `callbackfn` | (`previousValue`: [`Subscription`](../classes/Realm.App.Sync.Subscription), `currentValue`: [`Subscription`](../classes/Realm.App.Sync.Subscription), `currentIndex`: `number`, `array`: readonly [`Subscription`](../classes/Realm.App.Sync.Subscription)[]) => [`Subscription`](../classes/Realm.App.Sync.Subscription) |
| `initialValue` | [`Subscription`](../classes/Realm.App.Sync.Subscription) |

#### Returns

[`Subscription`](../classes/Realm.App.Sync.Subscription)

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[reduce](Realm.App.Sync.BaseSubscriptionSet#reduce)

▸ **reduce**<`U`\>(`callbackfn`, `initialValue`): `U`

Calls the specified callback function for all the elements in an array. The return value of the callback function is the accumulated result, and is provided as an argument in the next call to the callback function.

#### Type parameters

| Name |
| :------ |
| `U` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `callbackfn` | (`previousValue`: `U`, `currentValue`: [`Subscription`](../classes/Realm.App.Sync.Subscription), `currentIndex`: `number`, `array`: readonly [`Subscription`](../classes/Realm.App.Sync.Subscription)[]) => `U` | A function that accepts up to four arguments. The reduce method calls the callbackfn function one time for each element in the array. |
| `initialValue` | `U` | If initialValue is specified, it is used as the initial value to start the accumulation. The first call to the callbackfn function provides this value as an argument instead of an array value. |

#### Returns

`U`

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[reduce](Realm.App.Sync.BaseSubscriptionSet#reduce)

___

### reduceRight

▸ **reduceRight**(`callbackfn`): [`Subscription`](../classes/Realm.App.Sync.Subscription)

Calls the specified callback function for all the elements in an array, in descending order. The return value of the callback function is the accumulated result, and is provided as an argument in the next call to the callback function.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `callbackfn` | (`previousValue`: [`Subscription`](../classes/Realm.App.Sync.Subscription), `currentValue`: [`Subscription`](../classes/Realm.App.Sync.Subscription), `currentIndex`: `number`, `array`: readonly [`Subscription`](../classes/Realm.App.Sync.Subscription)[]) => [`Subscription`](../classes/Realm.App.Sync.Subscription) | A function that accepts up to four arguments. The reduceRight method calls the callbackfn function one time for each element in the array. |

#### Returns

[`Subscription`](../classes/Realm.App.Sync.Subscription)

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[reduceRight](Realm.App.Sync.BaseSubscriptionSet#reduceright)

▸ **reduceRight**(`callbackfn`, `initialValue`): [`Subscription`](../classes/Realm.App.Sync.Subscription)

#### Parameters

| Name | Type |
| :------ | :------ |
| `callbackfn` | (`previousValue`: [`Subscription`](../classes/Realm.App.Sync.Subscription), `currentValue`: [`Subscription`](../classes/Realm.App.Sync.Subscription), `currentIndex`: `number`, `array`: readonly [`Subscription`](../classes/Realm.App.Sync.Subscription)[]) => [`Subscription`](../classes/Realm.App.Sync.Subscription) |
| `initialValue` | [`Subscription`](../classes/Realm.App.Sync.Subscription) |

#### Returns

[`Subscription`](../classes/Realm.App.Sync.Subscription)

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[reduceRight](Realm.App.Sync.BaseSubscriptionSet#reduceright)

▸ **reduceRight**<`U`\>(`callbackfn`, `initialValue`): `U`

Calls the specified callback function for all the elements in an array, in descending order. The return value of the callback function is the accumulated result, and is provided as an argument in the next call to the callback function.

#### Type parameters

| Name |
| :------ |
| `U` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `callbackfn` | (`previousValue`: `U`, `currentValue`: [`Subscription`](../classes/Realm.App.Sync.Subscription), `currentIndex`: `number`, `array`: readonly [`Subscription`](../classes/Realm.App.Sync.Subscription)[]) => `U` | A function that accepts up to four arguments. The reduceRight method calls the callbackfn function one time for each element in the array. |
| `initialValue` | `U` | If initialValue is specified, it is used as the initial value to start the accumulation. The first call to the callbackfn function provides this value as an argument instead of an array value. |

#### Returns

`U`

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[reduceRight](Realm.App.Sync.BaseSubscriptionSet#reduceright)

___

### slice

▸ **slice**(`start?`, `end?`): [`Subscription`](../classes/Realm.App.Sync.Subscription)[]

Returns a section of an array.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `start?` | `number` | The beginning of the specified portion of the array. |
| `end?` | `number` | The end of the specified portion of the array. This is exclusive of the element at the index 'end'. |

#### Returns

[`Subscription`](../classes/Realm.App.Sync.Subscription)[]

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[slice](Realm.App.Sync.BaseSubscriptionSet#slice)

___

### some

▸ **some**(`predicate`, `thisArg?`): `boolean`

Determines whether the specified callback function returns true for any element of an array.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `predicate` | (`value`: [`Subscription`](../classes/Realm.App.Sync.Subscription), `index`: `number`, `array`: readonly [`Subscription`](../classes/Realm.App.Sync.Subscription)[]) => `unknown` | A function that accepts up to three arguments. The some method calls the predicate function for each element in the array until the predicate returns a value which is coercible to the Boolean value true, or until the end of the array. |
| `thisArg?` | `any` | An object to which the this keyword can refer in the predicate function. If thisArg is omitted, undefined is used as the this value. |

#### Returns

`boolean`

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[some](Realm.App.Sync.BaseSubscriptionSet#some)

___

### toLocaleString

▸ **toLocaleString**(): `string`

Returns a string representation of an array. The elements are converted to string using their toLocaleString methods.

#### Returns

`string`

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[toLocaleString](Realm.App.Sync.BaseSubscriptionSet#tolocalestring)

___

### toString

▸ **toString**(): `string`

Returns a string representation of an array.

#### Returns

`string`

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[toString](Realm.App.Sync.BaseSubscriptionSet#tostring)

___

### update

▸ **update**(`callback`): `Promise`<`void`\>

Update the SubscriptionSet and change this instance to point to the updated SubscriptionSet.

Adding or removing subscriptions from the set must be performed inside
the callback argument of this method, and the mutating methods must be called on
the `mutableSubs` argument rather than the original [SubscriptionSet](Realm.App.Sync.SubscriptionSet) instance.

Any changes to the subscriptions after the callback has executed will be batched and sent
to the server. You can either `await` the call to `update`, or call [waitForSynchronization](Realm.App.Sync.SubscriptionSet#waitforsynchronization)
to wait for the new data to be available.

Example:
```
await realm.subscriptions.update(mutableSubs => {
  mutableSubs.add(realm.objects("Cat").filtered("age > 10"));
  mutableSubs.add(realm.objects("Dog").filtered("age > 20"));
  mutableSubs.removeByName("personSubs");
});
// `realm` will now return the expected results based on the updated subscriptions
```

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `callback` | (`mutableSubs`: [`MutableSubscriptionSet`](../namespaces/Realm.App.Sync#mutablesubscriptionset)) => `void` | A callback function which receives a [MutableSubscriptionSet](Realm.App.Sync.MutableSubscriptionSet) instance as its only argument, which can be used to add or remove subscriptions from the set. Note: this callback should not be asynchronous. |

#### Returns

`Promise`<`void`\>

A promise which resolves when the SubscriptionSet is synchronized, or is rejected
if there was an error during synchronization (see {@link waitForSynchronisation})

___

### values

▸ **values**(): `IterableIterator`<[`Subscription`](../classes/Realm.App.Sync.Subscription)\>

Returns an iterable of values in the array

#### Returns

`IterableIterator`<[`Subscription`](../classes/Realm.App.Sync.Subscription)\>

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[values](Realm.App.Sync.BaseSubscriptionSet#values)

___

### waitForSynchronization

▸ **waitForSynchronization**(): `Promise`<`void`\>

Wait for the server to acknowledge this set of subscriptions and return the
matching objects.

If `state` is [SubscriptionsState.Complete](../enums/Realm.App.Sync.SubscriptionsState#complete), the promise will be resolved immediately.

If `state` is [SubscriptionsState.Error](../enums/Realm.App.Sync.SubscriptionsState#error), the promise will be rejected immediately.

#### Returns

`Promise`<`void`\>

A promise which is resolved when synchronization is complete, or is
rejected if there is an error during synchronisation.
