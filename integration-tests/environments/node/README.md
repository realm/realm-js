# Realm JS tests running in a Node.js environment

Currently this directory consists of:
- `index.js` which sets globals for the tests to use and requires in the test suite.

When running `npm install` a post-install script will package the test suite and install that as well as Realm from an
archive. Make sure the integration-tests folder contains a `realm-*.tgz` file before running this.

## Running the tests

To run tests:

    npm test
