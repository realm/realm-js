Importing `@thi.ng/bench` directly yields this error upon importing:

```
Error [ERR_PACKAGE_PATH_NOT_EXPORTED]: No "exports" main defined in (...)/realm-js/integration-tests/tests/node_modules/@thi.ng/bench/package.json
```

Our assumption is that ts-node doesn't transpile .js files which means ESM will be emitted and because of [ts-node's limited ESM support](https://github.com/TypeStrong/ts-node/issues/1007) we can't import the package.

Instead of importing it directly from the NPM package, we use `rollup` produce a single .js bundle that we can load.
