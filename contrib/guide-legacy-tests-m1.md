# How to run the legacy tests on the M1 Mac

Since we do not have a docker image to run our tests, the M1 users require a different strategy to run our tests for sync.
This involves deploying applications against the `realm-qa` server.  In order to setup your machine to do this, the following must be done.

The following environment variables must be set:

```
REALM_PUBLIC_KEY=<from team>
REALM_PRIVATE_KEY=<from team>
MONGODB_REALM_ENDPOINT=https://realm-qa.mongodb.com
MONGODB_REALM_PORT=443
LEGACY_TESTS_M1=true
```

Then just run the tests as normal.  This will do a deploy of the required apps automatically.
