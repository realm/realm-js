---
id: "Realm.App.Sync.MutableSubscriptionSet"
title: "Class: MutableSubscriptionSet"
sidebar_label: "Realm.App.Sync.MutableSubscriptionSet"
custom_edit_url: null
---

[App](../namespaces/Realm.App).[Sync](../namespaces/Realm.App.Sync).MutableSubscriptionSet

The mutable version of a given SubscriptionSet. The mutable methods of a given
[SubscriptionSet](Realm.App.Sync.SubscriptionSet) instance can only be accessed from inside the [SubscriptionSet.update](Realm.App.Sync.SubscriptionSet#update)
callback.

## Hierarchy

- [`BaseSubscriptionSet`](Realm.App.Sync.BaseSubscriptionSet)

  ↳ **`MutableSubscriptionSet`**

## Constructors

### constructor

• **new MutableSubscriptionSet**(`arrayLength?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `arrayLength?` | `number` |

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

• **length**: `number`

Gets or sets the length of the array. This is a number one higher than the highest index in the array.

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
{@link update} is applied.

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[version](Realm.App.Sync.BaseSubscriptionSet#version)

___

### [species]

▪ `Static` `Readonly` **[species]**: `ArrayConstructor`

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[[species]](Realm.App.Sync.BaseSubscriptionSet#[species])

## Methods

### [iterator]

▸ **[iterator]**(): `IterableIterator`<`any`\>

Iterator

#### Returns

`IterableIterator`<`any`\>

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[[iterator]](Realm.App.Sync.BaseSubscriptionSet#[iterator])

___

### [unscopables]

▸ **[unscopables]**(): `Object`

Returns an object whose properties have the value 'true'
when they will be absent when used in a 'with' statement.

#### Returns

`Object`

| Name | Type |
| :------ | :------ |
| `copyWithin` | `boolean` |
| `entries` | `boolean` |
| `fill` | `boolean` |
| `find` | `boolean` |
| `findIndex` | `boolean` |
| `keys` | `boolean` |
| `values` | `boolean` |

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[[unscopables]](Realm.App.Sync.BaseSubscriptionSet#[unscopables])

___

### add

▸ **add**<`T`\>(`query`, `options?`): [`Subscription`](Realm.App.Sync.Subscription)

Adds a query to the set of active subscriptions. The query will be joined via
an `OR` operator with any existing queries for the same type.

A query is represented by a [Realm.Results](../namespaces/Realm#results) instance returned from [Realm.objects](Realm#objects),
for example: `mutableSubs.add(realm.objects("Cat").filtered("age > 10"));`.

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `query` | [`Results`](../namespaces/Realm#results)<`T` & [`Object`](Realm.Object)\> | A [Realm.Results](../namespaces/Realm#results) instance representing the query to subscribe to. |
| `options?` | [`SubscriptionOptions`](../interfaces/Realm.App.Sync.SubscriptionOptions) | An optional [SubscriptionOptions](../interfaces/Realm.App.Sync.SubscriptionOptions) object containing options to use when adding this subscription (e.g. to give the subscription a name). |

#### Returns

[`Subscription`](Realm.App.Sync.Subscription)

A `Subscription` instance for the new subscription.

___

### at

▸ **at**(`index`): `any`

Takes an integer value and returns the item at that index,
allowing for positive and negative integers.
Negative integers count back from the last item in the array.

#### Parameters

| Name | Type |
| :------ | :------ |
| `index` | `number` |

#### Returns

`any`

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[at](Realm.App.Sync.BaseSubscriptionSet#at)

___

### concat

▸ **concat**(...`items`): `any`[]

Combines two or more arrays.
This method returns a new array without modifying any existing arrays.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `...items` | `ConcatArray`<`any`\>[] | Additional arrays and/or items to add to the end of the array. |

#### Returns

`any`[]

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[concat](Realm.App.Sync.BaseSubscriptionSet#concat)

▸ **concat**(...`items`): `any`[]

Combines two or more arrays.
This method returns a new array without modifying any existing arrays.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `...items` | `any`[] | Additional arrays and/or items to add to the end of the array. |

#### Returns

`any`[]

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[concat](Realm.App.Sync.BaseSubscriptionSet#concat)

___

### copyWithin

▸ **copyWithin**(`target`, `start`, `end?`): [`MutableSubscriptionSet`](Realm.App.Sync.MutableSubscriptionSet)

Returns the this object after copying a section of the array identified by start and end
to the same array starting at position target

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `target` | `number` | If target is negative, it is treated as length+target where length is the length of the array. |
| `start` | `number` | If start is negative, it is treated as length+start. If end is negative, it is treated as length+end. |
| `end?` | `number` | If not specified, length of the this object is used as its default value. |

#### Returns

[`MutableSubscriptionSet`](Realm.App.Sync.MutableSubscriptionSet)

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[copyWithin](Realm.App.Sync.BaseSubscriptionSet#copywithin)

___

### entries

▸ **entries**(): `IterableIterator`<[`number`, `any`]\>

Returns an iterable of key, value pairs for every entry in the array

#### Returns

`IterableIterator`<[`number`, `any`]\>

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[entries](Realm.App.Sync.BaseSubscriptionSet#entries)

___

### every

▸ **every**<`S`\>(`predicate`, `thisArg?`): this is S[]

Determines whether all the members of an array satisfy the specified test.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `S` | extends `any` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `predicate` | (`value`: `any`, `index`: `number`, `array`: `any`[]) => value is S | A function that accepts up to three arguments. The every method calls the predicate function for each element in the array until the predicate returns a value which is coercible to the Boolean value false, or until the end of the array. |
| `thisArg?` | `any` | An object to which the this keyword can refer in the predicate function. If thisArg is omitted, undefined is used as the this value. |

#### Returns

this is S[]

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[every](Realm.App.Sync.BaseSubscriptionSet#every)

▸ **every**(`predicate`, `thisArg?`): `boolean`

Determines whether all the members of an array satisfy the specified test.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `predicate` | (`value`: `any`, `index`: `number`, `array`: `any`[]) => `unknown` | A function that accepts up to three arguments. The every method calls the predicate function for each element in the array until the predicate returns a value which is coercible to the Boolean value false, or until the end of the array. |
| `thisArg?` | `any` | An object to which the this keyword can refer in the predicate function. If thisArg is omitted, undefined is used as the this value. |

#### Returns

`boolean`

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[every](Realm.App.Sync.BaseSubscriptionSet#every)

___

### fill

▸ **fill**(`value`, `start?`, `end?`): [`MutableSubscriptionSet`](Realm.App.Sync.MutableSubscriptionSet)

Changes all array elements from `start` to `end` index to a static `value` and returns the modified array

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `value` | `any` | value to fill array section with |
| `start?` | `number` | index to start filling the array at. If start is negative, it is treated as length+start where length is the length of the array. |
| `end?` | `number` | index to stop filling the array at. If end is negative, it is treated as length+end. |

#### Returns

[`MutableSubscriptionSet`](Realm.App.Sync.MutableSubscriptionSet)

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[fill](Realm.App.Sync.BaseSubscriptionSet#fill)

___

### filter

▸ **filter**<`S`\>(`predicate`, `thisArg?`): `S`[]

Returns the elements of an array that meet the condition specified in a callback function.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `S` | extends `any` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `predicate` | (`value`: `any`, `index`: `number`, `array`: `any`[]) => value is S | A function that accepts up to three arguments. The filter method calls the predicate function one time for each element in the array. |
| `thisArg?` | `any` | An object to which the this keyword can refer in the predicate function. If thisArg is omitted, undefined is used as the this value. |

#### Returns

`S`[]

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[filter](Realm.App.Sync.BaseSubscriptionSet#filter)

▸ **filter**(`predicate`, `thisArg?`): `any`[]

Returns the elements of an array that meet the condition specified in a callback function.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `predicate` | (`value`: `any`, `index`: `number`, `array`: `any`[]) => `unknown` | A function that accepts up to three arguments. The filter method calls the predicate function one time for each element in the array. |
| `thisArg?` | `any` | An object to which the this keyword can refer in the predicate function. If thisArg is omitted, undefined is used as the this value. |

#### Returns

`any`[]

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
| `S` | extends `any` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `predicate` | (`value`: `any`, `index`: `number`, `obj`: `any`[]) => value is S | find calls predicate once for each element of the array, in ascending order, until it finds one where predicate returns true. If such an element is found, find immediately returns that element value. Otherwise, find returns undefined. |
| `thisArg?` | `any` | If provided, it will be used as the this value for each invocation of predicate. If it is not provided, undefined is used instead. |

#### Returns

`S`

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[find](Realm.App.Sync.BaseSubscriptionSet#find)

▸ **find**(`predicate`, `thisArg?`): `any`

#### Parameters

| Name | Type |
| :------ | :------ |
| `predicate` | (`value`: `any`, `index`: `number`, `obj`: `any`[]) => `unknown` |
| `thisArg?` | `any` |

#### Returns

`any`

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[find](Realm.App.Sync.BaseSubscriptionSet#find)

___

### findByName

▸ **findByName**(`name`): [`Subscription`](Realm.App.Sync.Subscription)

Find a subscription by name.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `name` | `string` | The name to search for. |

#### Returns

[`Subscription`](Realm.App.Sync.Subscription)

The named subscription, or `null` if the subscription is not found.

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[findByName](Realm.App.Sync.BaseSubscriptionSet#findbyname)

___

### findByQuery

▸ **findByQuery**<`T`\>(`query`): [`Subscription`](Realm.App.Sync.Subscription)

Find a subscription by query. Will match both named and unnamed subscriptions.

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `query` | [`Results`](../namespaces/Realm#results)<`T` & [`Object`](Realm.Object)\> | The query to search for, represented as a [Realm.Results](../namespaces/Realm#results) instance, e.g. `Realm.objects("Cat").filtered("age > 10")`. |

#### Returns

[`Subscription`](Realm.App.Sync.Subscription)

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
| `predicate` | (`value`: `any`, `index`: `number`, `obj`: `any`[]) => `unknown` | find calls predicate once for each element of the array, in ascending order, until it finds one where predicate returns true. If such an element is found, findIndex immediately returns that element index. Otherwise, findIndex returns -1. |
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
| `callback` | (`value`: `any`, `index`: `number`, `array`: `any`[]) => `U` \| readonly `U`[] | A function that accepts up to three arguments. The flatMap method calls the callback function one time for each element in the array. |
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
| `callbackfn` | (`value`: `any`, `index`: `number`, `array`: `any`[]) => `void` | A function that accepts up to three arguments. forEach calls the callbackfn function one time for each element in the array. |
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
| `searchElement` | `any` | The element to search for. |
| `fromIndex?` | `number` | The position in this array at which to begin searching for searchElement. |

#### Returns

`boolean`

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[includes](Realm.App.Sync.BaseSubscriptionSet#includes)

___

### indexOf

▸ **indexOf**(`searchElement`, `fromIndex?`): `number`

Returns the index of the first occurrence of a value in an array, or -1 if it is not present.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `searchElement` | `any` | The value to locate in the array. |
| `fromIndex?` | `number` | The array index at which to begin the search. If fromIndex is omitted, the search starts at index 0. |

#### Returns

`number`

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[indexOf](Realm.App.Sync.BaseSubscriptionSet#indexof)

___

### join

▸ **join**(`separator?`): `string`

Adds all the elements of an array into a string, separated by the specified separator string.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `separator?` | `string` | A string used to separate one element of the array from the next in the resulting string. If omitted, the array elements are separated with a comma. |

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

Returns the index of the last occurrence of a specified value in an array, or -1 if it is not present.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `searchElement` | `any` | The value to locate in the array. |
| `fromIndex?` | `number` | The array index at which to begin searching backward. If fromIndex is omitted, the search starts at the last index in the array. |

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
| `callbackfn` | (`value`: `any`, `index`: `number`, `array`: `any`[]) => `U` | A function that accepts up to three arguments. The map method calls the callbackfn function one time for each element in the array. |
| `thisArg?` | `any` | An object to which the this keyword can refer in the callbackfn function. If thisArg is omitted, undefined is used as the this value. |

#### Returns

`U`[]

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[map](Realm.App.Sync.BaseSubscriptionSet#map)

___

### new

▸ **new**(): `never`

#### Returns

`never`

#### Overrides

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[new](Realm.App.Sync.BaseSubscriptionSet#new)

___

### pop

▸ **pop**(): `any`

Removes the last element from an array and returns it.
If the array is empty, undefined is returned and the array is not modified.

#### Returns

`any`

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[pop](Realm.App.Sync.BaseSubscriptionSet#pop)

___

### push

▸ **push**(...`items`): `number`

Appends new elements to the end of an array, and returns the new length of the array.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `...items` | `any`[] | New elements to add to the array. |

#### Returns

`number`

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[push](Realm.App.Sync.BaseSubscriptionSet#push)

___

### reduce

▸ **reduce**(`callbackfn`): `any`

Calls the specified callback function for all the elements in an array. The return value of the callback function is the accumulated result, and is provided as an argument in the next call to the callback function.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `callbackfn` | (`previousValue`: `any`, `currentValue`: `any`, `currentIndex`: `number`, `array`: `any`[]) => `any` | A function that accepts up to four arguments. The reduce method calls the callbackfn function one time for each element in the array. |

#### Returns

`any`

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[reduce](Realm.App.Sync.BaseSubscriptionSet#reduce)

▸ **reduce**(`callbackfn`, `initialValue`): `any`

#### Parameters

| Name | Type |
| :------ | :------ |
| `callbackfn` | (`previousValue`: `any`, `currentValue`: `any`, `currentIndex`: `number`, `array`: `any`[]) => `any` |
| `initialValue` | `any` |

#### Returns

`any`

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
| `callbackfn` | (`previousValue`: `U`, `currentValue`: `any`, `currentIndex`: `number`, `array`: `any`[]) => `U` | A function that accepts up to four arguments. The reduce method calls the callbackfn function one time for each element in the array. |
| `initialValue` | `U` | If initialValue is specified, it is used as the initial value to start the accumulation. The first call to the callbackfn function provides this value as an argument instead of an array value. |

#### Returns

`U`

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[reduce](Realm.App.Sync.BaseSubscriptionSet#reduce)

___

### reduceRight

▸ **reduceRight**(`callbackfn`): `any`

Calls the specified callback function for all the elements in an array, in descending order. The return value of the callback function is the accumulated result, and is provided as an argument in the next call to the callback function.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `callbackfn` | (`previousValue`: `any`, `currentValue`: `any`, `currentIndex`: `number`, `array`: `any`[]) => `any` | A function that accepts up to four arguments. The reduceRight method calls the callbackfn function one time for each element in the array. |

#### Returns

`any`

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[reduceRight](Realm.App.Sync.BaseSubscriptionSet#reduceright)

▸ **reduceRight**(`callbackfn`, `initialValue`): `any`

#### Parameters

| Name | Type |
| :------ | :------ |
| `callbackfn` | (`previousValue`: `any`, `currentValue`: `any`, `currentIndex`: `number`, `array`: `any`[]) => `any` |
| `initialValue` | `any` |

#### Returns

`any`

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
| `callbackfn` | (`previousValue`: `U`, `currentValue`: `any`, `currentIndex`: `number`, `array`: `any`[]) => `U` | A function that accepts up to four arguments. The reduceRight method calls the callbackfn function one time for each element in the array. |
| `initialValue` | `U` | If initialValue is specified, it is used as the initial value to start the accumulation. The first call to the callbackfn function provides this value as an argument instead of an array value. |

#### Returns

`U`

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[reduceRight](Realm.App.Sync.BaseSubscriptionSet#reduceright)

___

### remove

▸ **remove**<`T`\>(`query`): `boolean`

Removes a subscription with the given query from the SubscriptionSet.

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `query` | [`Results`](../namespaces/Realm#results)<`T` & [`Object`](Realm.Object)\> | A [Realm.Results](../namespaces/Realm#results) instance representing the query to remove a subscription to. |

#### Returns

`boolean`

`true` if the subscription was removed, `false` if it was not found.

___

### removeAll

▸ **removeAll**(): `number`

Removes all subscriptions from the SubscriptionSet.

#### Returns

`number`

The number of subscriptions removed.

___

### removeByName

▸ **removeByName**(`name`): `boolean`

Removes a subscription with the given name from the SubscriptionSet.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `name` | `string` | The name of the subscription to remove. |

#### Returns

`boolean`

`true` if the subscription was removed, `false` if it was not found.

___

### removeByObjectType

▸ **removeByObjectType**(`objectType`): `number`

Removes all subscriptions for the specified object type from the SubscriptionSet.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `objectType` | `string` | The string name of the object type to remove all subscriptions for. |

#### Returns

`number`

The number of subscriptions removed.

___

### removeSubscription

▸ **removeSubscription**(`subscription`): `boolean`

Removes the specified subscription from the SubscriptionSet.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `subscription` | [`Subscription`](Realm.App.Sync.Subscription) | The [Subscription](Realm.App.Sync.Subscription) instance to remove. |

#### Returns

`boolean`

`true` if the subscription was removed, `false` if it was not found.

___

### reverse

▸ **reverse**(): `any`[]

Reverses the elements in an array in place.
This method mutates the array and returns a reference to the same array.

#### Returns

`any`[]

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[reverse](Realm.App.Sync.BaseSubscriptionSet#reverse)

___

### shift

▸ **shift**(): `any`

Removes the first element from an array and returns it.
If the array is empty, undefined is returned and the array is not modified.

#### Returns

`any`

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[shift](Realm.App.Sync.BaseSubscriptionSet#shift)

___

### slice

▸ **slice**(`start?`, `end?`): `any`[]

Returns a copy of a section of an array.
For both start and end, a negative index can be used to indicate an offset from the end of the array.
For example, -2 refers to the second to last element of the array.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `start?` | `number` | The beginning index of the specified portion of the array. If start is undefined, then the slice begins at index 0. |
| `end?` | `number` | The end index of the specified portion of the array. This is exclusive of the element at the index 'end'. If end is undefined, then the slice extends to the end of the array. |

#### Returns

`any`[]

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[slice](Realm.App.Sync.BaseSubscriptionSet#slice)

___

### some

▸ **some**(`predicate`, `thisArg?`): `boolean`

Determines whether the specified callback function returns true for any element of an array.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `predicate` | (`value`: `any`, `index`: `number`, `array`: `any`[]) => `unknown` | A function that accepts up to three arguments. The some method calls the predicate function for each element in the array until the predicate returns a value which is coercible to the Boolean value true, or until the end of the array. |
| `thisArg?` | `any` | An object to which the this keyword can refer in the predicate function. If thisArg is omitted, undefined is used as the this value. |

#### Returns

`boolean`

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[some](Realm.App.Sync.BaseSubscriptionSet#some)

___

### sort

▸ **sort**(`compareFn?`): [`MutableSubscriptionSet`](Realm.App.Sync.MutableSubscriptionSet)

Sorts an array in place.
This method mutates the array and returns a reference to the same array.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `compareFn?` | (`a`: `any`, `b`: `any`) => `number` | Function used to determine the order of the elements. It is expected to return a negative value if the first argument is less than the second argument, zero if they're equal, and a positive value otherwise. If omitted, the elements are sorted in ascending, ASCII character order. ```ts [11,2,22,1].sort((a, b) => a - b) ``` |

#### Returns

[`MutableSubscriptionSet`](Realm.App.Sync.MutableSubscriptionSet)

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[sort](Realm.App.Sync.BaseSubscriptionSet#sort)

___

### splice

▸ **splice**(`start`, `deleteCount?`): `any`[]

Removes elements from an array and, if necessary, inserts new elements in their place, returning the deleted elements.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `start` | `number` | The zero-based location in the array from which to start removing elements. |
| `deleteCount?` | `number` | The number of elements to remove. |

#### Returns

`any`[]

An array containing the elements that were deleted.

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[splice](Realm.App.Sync.BaseSubscriptionSet#splice)

▸ **splice**(`start`, `deleteCount`, ...`items`): `any`[]

Removes elements from an array and, if necessary, inserts new elements in their place, returning the deleted elements.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `start` | `number` | The zero-based location in the array from which to start removing elements. |
| `deleteCount` | `number` | The number of elements to remove. |
| `...items` | `any`[] | Elements to insert into the array in place of the deleted elements. |

#### Returns

`any`[]

An array containing the elements that were deleted.

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[splice](Realm.App.Sync.BaseSubscriptionSet#splice)

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

### unshift

▸ **unshift**(...`items`): `number`

Inserts new elements at the start of an array, and returns the new length of the array.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `...items` | `any`[] | Elements to insert at the start of the array. |

#### Returns

`number`

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[unshift](Realm.App.Sync.BaseSubscriptionSet#unshift)

___

### values

▸ **values**(): `IterableIterator`<`any`\>

Returns an iterable of values in the array

#### Returns

`IterableIterator`<`any`\>

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[values](Realm.App.Sync.BaseSubscriptionSet#values)

___

### from

▸ `Static` **from**<`T`\>(`arrayLike`): `T`[]

Creates an array from an array-like object.

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `arrayLike` | `ArrayLike`<`T`\> | An array-like object to convert to an array. |

#### Returns

`T`[]

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[from](Realm.App.Sync.BaseSubscriptionSet#from)

▸ `Static` **from**<`T`, `U`\>(`arrayLike`, `mapfn`, `thisArg?`): `U`[]

Creates an array from an iterable object.

#### Type parameters

| Name |
| :------ |
| `T` |
| `U` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `arrayLike` | `ArrayLike`<`T`\> | An array-like object to convert to an array. |
| `mapfn` | (`v`: `T`, `k`: `number`) => `U` | A mapping function to call on every element of the array. |
| `thisArg?` | `any` | Value of 'this' used to invoke the mapfn. |

#### Returns

`U`[]

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[from](Realm.App.Sync.BaseSubscriptionSet#from)

▸ `Static` **from**<`T`\>(`iterable`): `T`[]

Creates an array from an iterable object.

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `iterable` | `Iterable`<`T`\> \| `ArrayLike`<`T`\> | An iterable object to convert to an array. |

#### Returns

`T`[]

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[from](Realm.App.Sync.BaseSubscriptionSet#from)

▸ `Static` **from**<`T`, `U`\>(`iterable`, `mapfn`, `thisArg?`): `U`[]

Creates an array from an iterable object.

#### Type parameters

| Name |
| :------ |
| `T` |
| `U` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `iterable` | `Iterable`<`T`\> \| `ArrayLike`<`T`\> | An iterable object to convert to an array. |
| `mapfn` | (`v`: `T`, `k`: `number`) => `U` | A mapping function to call on every element of the array. |
| `thisArg?` | `any` | Value of 'this' used to invoke the mapfn. |

#### Returns

`U`[]

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[from](Realm.App.Sync.BaseSubscriptionSet#from)

___

### isArray

▸ `Static` **isArray**(`arg`): arg is any[]

#### Parameters

| Name | Type |
| :------ | :------ |
| `arg` | `any` |

#### Returns

arg is any[]

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[isArray](Realm.App.Sync.BaseSubscriptionSet#isarray)

___

### of

▸ `Static` **of**<`T`\>(...`items`): `T`[]

Returns a new array from a set of elements.

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `...items` | `T`[] | A set of elements to include in the new array object. |

#### Returns

`T`[]

#### Inherited from

[BaseSubscriptionSet](Realm.App.Sync.BaseSubscriptionSet).[of](Realm.App.Sync.BaseSubscriptionSet#of)
