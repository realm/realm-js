# Realm Web integration tests

For ultimate flexability, the tests are written to be able to run from both Node.js and a browser.

## Running the tests

Ensure you have access to a running instance of Atlas App Services.

To run it locally, ensure you have Docker and your Realm AWS credentials installed and run

```
docker run --rm -p 9090:9090 -it ghcr.io/realm/ci/mongodb-realm-test-server:latest
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
2. Go to http://localhost:9090 (or wherever your Atlas App Services server is listening)
3. Setup the appropriate authentication providers.

To enable testing credentials that require interaction, run with DEV_TOOLS and TEST_CREDENTIALS set to a comma-separated list of credentials.

```
DEV_TOOLS=1 TEST_CREDENTIALS=anonymous,email-password,google npm test
```

## Running the Google Sign-In integration test

Run the tests once to import a test app into the Atlas App Services server you're testing against.
Take note of the app id that it gets assigned and navigate to the Admin UI of the server to setup the Google Authentication Provider.
Make sure to toggle on "OpenID Connect".

Start the integration tests dev server with dev tools enabled (to keep the browser opened) and provide both the app id and your Google client id:

```
GOOGLE_CLIENT_ID=414565162824-bqn7utq2u2hue0qum7eu7lfpmmq8p4qg.apps.googleusercontent.com MDB_REALM_APP_ID=my-test-app-fwoue DEV_TOOLS=1 npm test
```

After the tests have run, navigate the browser window to http://localhost:8080/google-login, click the button to "Sign in with Google" and complete the authentication flow.

## Additional environment variables

To skip importing the app or use a different server, specify one or more of the following environment variables:

- `MDB_REALM_APP_ID`
- `MDB_REALM_BASE_URL`
- `MDB_REALM_USERNAME`
- `MDB_REALM_PASSWORD`

```
npx realm-cli export --base-url http://localhost:9090 --config-path ./realm-config --app-id my-test-app-kuxuo
```
