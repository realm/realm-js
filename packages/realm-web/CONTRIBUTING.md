## The structure of this package

In an attempt to ensure that this package remains usable across multiple runtimes (Node.js and modern web-browsers), the TypeScript configurations are a bit more restrictive than they need to be in other packages.

Specifically, the source code (`./src`) is separated into four parts:

### The runtime independent library code

Code in the `./src` directory and all its sub-directories (excluding the directories mentioned in the next couple of sections).
This is supposed to be written without the usage of Node.js nor DOM types, and must use the `environment` interface to get access to environment specific capabilities.

### Code intended for the Node.js runtime

All code located in `./src/node` is aware of the Node.js runtime.

### Code intended for the browser (DOM) runtime

All code located in `./src/dom` is aware of browser's DOM runtime.

### Code intended for testing / Mocha

All code located in `./src/tests` is aware of Mocha globals and the Node.js runtime.

## Releasing

Run the NPM version command with the proper increment (major, minor, patch) based on the changes in the changelog.

For a breaking change `npm version major`, for enhancements and features `npm version minor` and for bugfixes `npm version patch`.

This will:
- Update the versions in package.json and package-lock.json,
- Update the versions in the CHANGELOG.md and README.md
- Commit and create a tag.

When you've verified this an you're ready to release, simply push (with tags) to the main branch and let CI complete the build, test and publish of the package.

```
git push --tags
```
