# Contributing

## Filing Issues

Whether you find a bug, typo or an API call that could be clarified, please [file an issue](https://github.com/realm/realm-js/issues) on our GitHub repository.

When filing an issue, please provide as much of the following information as possible in order to help others fix it:

1. **Goals**
2. **Expected results**
3. **Actual results**
4. **Steps to reproduce**
5. **Code sample that highlights the issue** (full Xcode / Android Studio projects that we can compile ourselves are ideal)
6. **Version of Realm / Xcode/ Android Studio/ OSX/ WIN**

If you'd like to send us sensitive sample code to help troubleshoot your issue, you can email <help@realm.io> directly.

## Contributing Bug Fixes and Enhancements

We love contributions to Realm! If you'd like to fix bugs, contribute code, documentation, or add any other improvements, we recommend that you either [find an existing issue](https://github.com/realm/realm-js/issues?q=is%3Aopen+is%3Aissue+label%3AFirst-Good-Issue) or create a new issue to pitch what you would like to work on. Once you are ready to contribute, please [file a Pull Request](https://github.com/realm/realm-js/pulls) on our GitHub repository. Make sure to accept our [CLA](#cla).

If you're on the MongoDB payroll, please ensure you're familiar with [the Realm SDK cross-team working agreement](https://docs.google.com/document/d/1AB9Z1F29oLmubnPAjfphYwGz1xqqeotHaMWK5OKkL3A/edit).

When creating a PR as an external contributor, please express your intent with your PR; what do you want to solve? To avoid duplication, please link your PR to an existing issue.

Moreover, indicate how you would like us to support you. We will happily guide you and work with you to move the PR to a point where it can be merged. It might require considerable work at your end to meet our expectations (code quality, API docs, TS defs, tests, etc.). In the case you want to move on and not work with us, please let us know. If the PR meets our expectations, we will merge it - and if it doesn't, we will either take over or close it, depending on the requirement on our time and our current priorities.

### Branching

If you’re working on a long-living branch, keep it updated with upstream changes by rebasing it on the target branch on a regular basis. This requires a force-push, so you should coordinate with anyone working on the same branch team when doing that.

### CLA

Realm welcomes all contributions! The only requirement we have is that, like many other projects, we need to have a [Contributor License Agreement](https://en.wikipedia.org/wiki/Contributor_License_Agreement) (CLA) in place before we can accept any external code. Our own CLA is a modified version of the Apache Software Foundation’s CLA.

[Please submit your CLA electronically using our Google form](https://docs.google.com/forms/d/e/1FAIpQLSeQ9ROFaTu9pyrmPhXc-dEnLD84DbLuT_-tPNZDOL9J10tOKQ/viewform) so we can accept your submissions. The GitHub username you file there will need to match that of your Pull Requests. If you have any questions or cannot file the CLA electronically, you can email <help@realm.io>.

## Getting started contributing

Browse the [contrib](./contrib/) directory for detailed guides on building and testing the library.

TLDR; We have an NPM workspace mono-repo, orchestrated by [Wireit](https://github.com/google/wireit).

```shell
# Clone the repository (with submodules)
git clone --recurse-submodules git@github.com:realm/realm-js.git
# Change directory into the git repo
cd realm-js
# Install dependencies
npm install
# Run the node tests (which will transitively generate the binding, build the SDK, etc.)
npm test --workspace @realm/node-tests
```

## Running the "sync test" (requires running the sync server, a.k.a. baas)

Due to its proprietary license, we're not able to publish docker images for the server, so the following steps are only available to MongoDB employees.

First, you need to follow the guide on ["Using Docker to run a BAAS server instance"](https://wiki.corp.mongodb.com/display/10GEN/%28Device+Sync%29+Using+Docker+to+run+a+BAAS+server+instance).

Create an `.env` file in the `integration-tests/baas-test-server` directory, with the following content (replacing `...` with values from the guide above):

```
AWS_PROFILE="..."
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
BAASAAS_KEY="..."
```

```shell
# Start the server
npm start --workspace @realm/baas-test-server
# Run the tests (which will no longer skip sync tests)
npm test --workspace @realm/node-tests
```

<!-- TODO: Create a guide on running tests on the other supported platforms -->
