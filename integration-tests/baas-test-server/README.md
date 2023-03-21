# Run BaaS from source

Run the Lerna bootstrap from the root of this repository.

```shell
npx lerna bootstrap --scope @realm/baas-test-server
```

Create a `.env` file with your `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` secrets.

```shell
# .env
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

A file called `assisted_agg` will be downloaded if it does not already exist in order for MongoDB aggregation tests to run.
* When running the tests, Mac may block execution of the file. If so, go
   to `System Settings > Privacy & Security` (for Mac), find blocked files, then allow `assisted_agg`.

Run the `start` script, sit back and relax as a mongo server is started, BaaS is pulled, built and started with a proper configuration 🤞

```shell
npm start
```

Visit the administrative UI in your browser, if you need to.

```shell
open http://localhost:9090
```
