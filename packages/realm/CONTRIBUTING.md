# Contributing to the package

// TODO: Move this to the root repository, once the migration to Turbo Repo has completed

## Installing dependencies

First install the root package to install shared development ependencies.

```
npm install
```

Then use Lerna to install dependencies of this package and its dependencies.

```
npx lerna bootstrap --scope realm --include-dependencies
```

## Executing the tests

Use Turborepo to run the `test` NPM script in all relevant packages (from any directory of the package).

```
npx turbo run test
```

This will incrementally generate & build any dependencies.

## Build everything

Use Turborepo to run the `build` NPM script in all relevant packages (from any directory of the package).

```
npx turbo run build
```

This will incrementally generate & build any dependencies.
