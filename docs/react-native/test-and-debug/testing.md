# Testing - React Native SDK
You can test the Realm React Native SDK with popular React Native testing libraries
like [Jest](https://jestjs.io/), [Jasmine](https://jasmine.github.io/),
and [Mocha](https://mochajs.org/).

> Seealso:
> [Official React Native Testing Documentation](https://reactnative.dev/docs/testing-overview)
>

## Clean Up Tests
When testing the Realm React Native SDK, you must close realms with `Realm.close()` after you're done
with them to prevent memory leaks.

You should also delete the realm file  with `Realm.deleteFile()`
during clean up to keep your tests idempotent.

The below example uses the Jest testing framework. It uses Jest's built-in `beforeEach()`
and `afterEach()` hooks for test set up and tear down, respectively.

```javascript
const config = {
  schema: [Car],
  path: "testing.realm",
};
let realm;
beforeEach(async () => {
  realm = await Realm.open(config);
});
afterEach(() => {
  if (!realm.isClosed) {
    realm.close();
  }
  if (config) {
    Realm.deleteFile(config);
  }
});
test("Close a Realm", async () => {
  expect(realm.isClosed).toBe(false);
  realm.close();
  expect(realm.isClosed).toBe(true);
});

```
