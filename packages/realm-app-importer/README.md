# Realm App Importer

Imports an app directory into MongoDB Realm (formerly known as Stitch).

This CLI works around a few shortcomings of the official Realm CLI - most notably around import of apps referencing secrets. When importing an app, the server creates an app id based on the apps name. This package also helps you inject this id into other tools by either saving it to a file or serving it over HTTP.

## Importing an app

If you don't have an app to import, read the section on "exporting" below.

Ensure you have this CLI installed in your project as a dev-dependency.

    npm install realm-app-importer --save-dev

When you have a templated app that you want to download (stored in ./my-app-template for example), run

    npx realm-app-importer ./my-app-template

To import secrets add a secrets.json to the template directory, containing a single JSON object with keys and string values:

```json
{
	"my-secret": "v3ry-s3cr3t"
}
```

### Runtime options

```
realm-app-importer <template-path>

Import a Realm App

Positionals:
  template-path  Path of the application directory to import            [string]

Options:
  --version              Show version number                           [boolean]
  --help                 Show help                                     [boolean]
  --base-url             Base url of the MongoDB Realm server to import the app
                         into        [string] [default: "http://localhost:9090"]
  --username             Username of an adminstrative user
                                    [string] [default: "unique_user@domain.com"]
  --password             Password of an adminstrative user
                                                  [string] [default: "password"]
  --config               Path for the realm-cli configuration to temporarily
                         store credentials
                                         [string] [default: "realm-config.json"]
  --apps-directory-path  Path to temporarily copy the app while importing it
                                             [string] [default: "imported-apps"]
  --app-id-path          Saves the app id to a file at this path        [string]
  --app-id-port          Starts up an HTTP server and serves the app id [number]
```

Besides the `<template-path>` the CLI takes a few optional runtime parameters, most of which should be self-explainatory and set to defaults that should ease the usecase of integration tests agains local deployments.

When using this for integration tests, there exists a couple of ways to get a hold of the id of the app, once it's imported:

1. the consuming test harness can use the package programically, instantiating the `RealmAppImporter` class and calling its `importApp` method, which returns a `Promise<{ appId: string }>`.
2. the `--app-id-path` runtime option saves the app id to a file, which can be read by the test harness.
3. the `--app-id-port` runtime option starts up a web-server on the specified port and serves the app id as a text response.

## Exporting an app

Ensure you have the official Stitch CLI installed in your project as a dev-dependency,

    npm install mongodb-realm-cli --save-dev

Log into the official Stitch CLI:

    npx realm-cli login --api-key <your-api-key> --private-api-key <your-private-api-key>

Export a Stitch app that you want to import later

    npx realm-cli export --output ./my-app-template --as-template --app-id <your-app-id>

Where `<your-app-id>` is replaced with the app id found in the UI.

We're using the `--as-template` flag to ask the CLI to not store any ids into the exported files.

You might also need to specify a `--project-id` (equivalent with as group-id) in which the app was originally created.

See [the Realm CLI documentation](https://docs.mongodb.com/realm/deploy/realm-cli-reference/) for more information.
