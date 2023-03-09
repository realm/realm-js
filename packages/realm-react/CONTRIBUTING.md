# Contribution Guide
## Introduction
We are extremely happy for any contributions to `@realm/react`.  While we (the Realm team) are working hard to provide you the best possible experience as developers, we have a long backlog of things we want to do. If you are having an issue with or an idea for this package and want to take it on yourself, feel free to open a PR and we will help guide you to get it merged.

That being said, the following should be considered along with the code changes:
* Regression tests that fail without the code changes and pass with the code changes
  * Make sure the tests suite is passing before writing any code or new tests
  * It is recommended to write a failing tests first, before making any changes
* Run the `eslint` and `tsc` before opening your PR for review
  * `npm run build`
  * `npm run lint`
* Add comments explaining any non-obvious changes
* If you are making changes to the interfaces, please update the tsdoc blocks as well
* Please consult the general [realm-js contribution guide](https://github.com/realm/realm-js/blob/main/CONTRIBUTING.md)


## Building and Running the Tests
`realm-js` is a monorepo that uses `lerna` to dynamically link dependencies.  In the case of `@realm/react`, the `realm` library is linked into the package.  Therefore, one must build `realm` in order to run the `@realm/react` tests.  There is already a [guide for building realm](https://github.com/realm/realm-js/blob/main/contrib/building.md), but an abridged version is provided here.

It is assumed you are already setup to run a `react-native` project and are on a mac (if not see the [guide for building realm](https://github.com/realm/realm-js/blob/main/contrib/building.md)), so a good amount of the required [pre-req steps](https://github.com/realm/realm-js/blob/main/contrib/building.md#setup-instructions-for-macos) are already accomplished.  One requirement is `cmake`, which can be installed with:

```
brew install cocoapods cmake
```

That should be enough to get started.  If you are making changes to c++ code then I recommend setting up [`ccache`](https://github.com/realm/realm-js/blob/main/contrib/building.md#ccache), but if not, feel free to skip that step.

The rest of the steps are as follows.

* clone the project
```
git clone https://github.com/realm/realm-js.git
cd realm-js
```

* load the external dependencies (ie realm-core)
```
git submodule update --init --recursive
```

* install js packages and build realm
```
npm install && npm run build
```

* install and link all dependencies to `@realm/react`
```
npx lerna bootstrap --scope @realm/react --include-dependencies
```

* navigate to `@realm-react` and run the tests
```
cd packages/realm-react
npm run test
```

* optionally run the watcher and match to a specific test suite
```
npm run test -- --watch --testNamePattern "useQueryRender" --detectOpenHandles
```
