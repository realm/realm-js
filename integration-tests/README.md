# Realm JS integration tests

This directory of the repository is contains two sub-directories:
- `test`: A suite of tests.
- `environments`: A couple of environments in which the tests are supposed pass.

## How to run the tests

First install the root project at `..` and cd into the `react-native/android` folder to build the Android library:

    npm install
    cd react-native/android
    ./gradlew publishAndroid

Install all the environments, run npm install command in this directory:

    cd integration-tests
    npm install

Then run all the tests in sequence by running the npm test command, also from within this directory:

    cd integration-tests
    npm test

## Current limitations

This is still very much a work in progress, currently we're missing:
1. Refactoring / rewriting of the tests in `../tests/js` into the `./tests` folder that uses Mocha in a more direct way.
2. When installing the `react-native` environment, the `node_modules/realm/android` is missing.
