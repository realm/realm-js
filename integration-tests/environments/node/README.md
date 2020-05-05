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

## Post-install script and peer dependencies

The `realm` and `realm-integration-tests` packages are listed `*` in `peerDependencies` in the `package.json` and the actual tests are run against an archived package of Realm JS, expected to be stored as `integrations-tests/realm.tgz`. This is installed with `--no-save` as well as `--build-from-source=realm --realm_enable_sync` (to prevent a pre-built binary from being downloaded) to avoid integrity checks failing when NPM compares the SHA of the archives with SHA in the package-lock.json.
