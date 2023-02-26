# Realm JS tests running in a Node.js environment

Currently this directory consists of:
- `index.js` which sets globals for the tests to use and requires in the test suite.

To install this environment, run the following command from the root directory of repository:

```bash
npx lerna bootstrap --scope @realm/node-tests --include-dependencies
```

## Running the tests

To run tests:

    npm test
