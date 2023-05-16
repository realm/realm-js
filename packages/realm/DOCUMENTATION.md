For sake of consistency, here are some general principles to follow when writing [TSDoc](https://tsdoc.org/) for Realm classes' properties and methods.

### Methods:
Here are all the tags Realm class methods are likely to have, **listed in the order that they should be described in**.
- **ALL TAGS**
    - Should have description start with an uppercase letter. 
    - Should have description end with a period.
    - Should **not** have types that are already obvious with TypeScript.
    - All methods that override built-in JS parent class methods (i.e. `forEach`, `map`) should avoid unnecesary comments (if reasonable) as they will likely already have built-in documentation that is inherited.

- **Description**
    - Description of the method should go first. Use the 3rd person instead of the 2nd person.
        - ✅ *Adds one element to the list*
        - ❌ *Add one element to the list*
- `@readonly`?
    - Include this tag if the field is read-only, this is only relevant for getter methods.
- `@param {name} {description}`
    - ✅ `@param `**config**` The configuration of the app.`
    - ❌ `@param {boolean} config - the config`
    - Should **not** have a dash after param. name (some of the legacy documentation and is actually ignored by JSDoc but for sake of consistency it would be good to avoid this)
- `@throws {@link errorType} {If / When + description}`
    - ✅ `@throws {Error} If no app id is provided.`
    - ✅ `@throws {@link RuntimeError} When Realm closes.`
    - ❌ `@throws no app id is provided.`
    - Should have description **start with If or When**.
    - Should include error type, i.e. `{@link Error}`, `{@link TypeError}` using a [@link](https://tsdoc.org/pages/tags/link/) to provide a semantic reference.
- `@returns {description}`
    - ✅ `@returns The last value or undefined if the list is empty.`
    - ✅ `@returns `**true**`  if the value exists in the Set, ` **false**` if not.`
    - ❌ `@returns appId`
    - For **boolean** return values, use `@returns` \`true\` `if X,` \`false\` `if not.`
- `@see, etc. ... `
    - Tags such as `@see` can be decided on case-by-case basis. For example, if `@see` is used instead of description to refer to external documentation, it can be in place of description. If it is used as more of a "if interested, learn more by looking here", `@see` can be included after `@returns`.
- `@example`
- `@since`
    - Kept because of old documenation, not necessarily useful. 

Some examples of annotations following the principles above:
```ts
/**
   * Returns the maximum value of the values in the collection or of the
   * given property among all the objects in the collection, or `undefined`
   * if the collection is empty.
   *
   * Only supported for int, float, double and date properties. `null` values
   * are ignored entirely by this method and will not be returned.
   *
   * @param property For a collection of objects, the property to take the maximum of.
   * @throws {Error} If no property with the name exists or if property is not numeric/date.
   * @returns The maximum value.
   * @since 1.12.1
*/
max(property?: string): number | Date | undefined;

/**
   * Check for existence of a value in the Set
   * @param value Value to search for in the Set
   * @throws {@link TypeError} If a `value` is not of a type which can be stored in
   *   the Set, or if an object being added to the Set does not match the
   *   **object schema** for the Set.
   * @returns `true` if the value exists in the Set, `false` if not.
*/
has(value: T): boolean;

/**
   * This is the same method as the {@link Collection.values} method.
   * Its presence makes collections _iterable_, thus able to be used with ES6
   * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for...of `for-of`}
   * loops,
   * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_operator `...`}
   * spread operators, and more.
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/iterator Symbol.iterator}
   *   and the {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols#iterable iterable protocol}
   * @returns Iterable of each value in the collection
   * @example
   * for (let object of collection) {
   *   // do something with each object
   * }
   * @since 0.11.0
   */
abstract [Symbol.iterator](): Iterator<T>;
```
