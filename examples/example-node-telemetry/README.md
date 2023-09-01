# Telemetry demo app using data ingest and Atlas Charts

A [node.js](https://nodejs.org) application to demonstrate how to use [Atlas Device Sync](https://www.mongodb.com/atlas/app-services/device-sync) and [Realm JavaScript](https://github.com/realm/realm-js) to read sensor data, store the data in [Atlas](https://www.mongodb.com/atlas), and visualize it with [Charts](https://www.mongodb.com/products/charts).

The file structure is as follows:

```
├── README.md
├── package.json
├── src
│   ├── app.ts
│   ├── config.ts
│   └── models
│       ├── machine_info.ts
│       └── sensor_reading.ts
```

* `src/app.ts` - the actual application
* `src/config.ts` - contains the configuration (app id)
* `src/models/` - the model classes

## How to build and run

You need to clone Realm JavaScript's git repository:

```sh
git clone https://github.com/realm/realm-js
cd realm-js
git submodule update --init --recursive
```

Moreover, you need to install the dependencies for this app:

```sh
cd examples/example-node-telemetry
npm install
```

Before building the app, you need to add your app id to `src/config.ts`. After that, you can build and run the app:

```sh
npm run build
node dist/app.js
```

You can enable debug messages:

```sh
DEBUG=realm:telemetry node dist/app.js # only debug messages for the app
DEBUG=realm:* node dist/app.js         # debug messages for many Realm operations - WARNING: much output
```
