# Realm JS tests running in a Node.js environment

Currently this directory consists of:
- `index.js` which sets globals for the tests to use and requires in the test suite.

To install this environment, simply run:

```bash
npm install
```

To avoid integrity checks failing when NPM compares the SHA of the `realm` and `realm-integration-tests` archives with SHA in the package-lock.json we `npm install` the archives on `preinstall`.

## Running the tests

To run tests:

    npm test
