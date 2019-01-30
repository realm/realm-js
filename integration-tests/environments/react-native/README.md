# Realm JS tests running in an React Native enviroment

Because React Native's packager (Metro) does not support symbolic links, we need to install Realm JS and the shared
test suite from an archive. While iterating on the tests re-install the package to pack tests and re-install them.

```bash
npm install
```

This script is also called when installing the package initially.

## Running the tests

To run tests on Android, start an emulator and run:

    npm run test/android

To run tests on iOS:

    npm run test/ios

To run tests both processes in sequence, start an Android emulator and run:

    npm test
