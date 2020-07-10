# Realm Web integration tests

For ultimate flexability, the tests are written to be able to run from both Node.js and a browser.

## Running the tests

Ensure you have access to a running instance of MongoDB Realm.

To run it locally, ensure you have Docker and your Realm AWS credentials installed and run

```
docker run --rm -i -t --publish 9090:9090 012067661104.dkr.ecr.eu-west-1.amazonaws.com/ci/mongodb-realm-images:test_server-0ed2349a36352666402d0fb2e8763ac67731768c-race
```

## Running the tests from Node.js

To enable a short feedback loop the integration tests can be run from Node.js (via the Mocha CLI):

```
npm start
```

This will start the tests with Mocha in --watch mode.
To narrow in and run a single test, use the --grep runtime argument:

```
npm start -- --grep Credentials
```

## Running the tests from a browser

To start the harness, opening a headless Chromium browser (via Puppeteer), run:

```
npm test
```

To enable a long timeout and open developer tools, run this with the DEV_TOOLS environment variable.

```
DEV_TOOLS=1 npm test
```

## Running the OAuth integration tests

Currently, these are only available when running in a browser.

Before running tests which depends on a specific authentication provider:
1. Run once to import the app,
2. Go to http://localhost:9090 (or whereever your MongoDB Realm server is listening)
3. Setup the appropriate authentication providers.

To enable testing credentials that require interaction, run with DEV_TOOLS and TEST_CREDENTIALS set to a comma-separated list of credentials.

```
DEV_TOOLS=1 TEST_CREDENTIALS=anonymous,email-password,google npm test
```

## Additional environment variables

To skip importing the app or use a different server, specify one or more of the following environment variables:

- `MDB_REALM_APP_ID`
- `MDB_REALM_BASE_URL`
- `MDB_REALM_USERNAME`
- `MDB_REALM_PASSWORD`
