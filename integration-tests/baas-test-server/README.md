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

A file called `assisted_agg` needs to be downloaded in order for MongoDB aggregation tests to run:
1. Download the file `assisted_agg` (if on Mac) or `libmongo.so` (if on Linux) and add it
   to your `PATH` (see [BaaS Local Environment Setup](https://github.com/10gen/baas/blob/master/etc/docs/onboarding.md)).
2. Load the `PATH` variable to the terminal window used for starting the BaaS server.
3. Allow the file to be executable (run: `chmod +x your/path/to/assisted_agg`).
4. When running the test again, Mac will block execution of the file. Then (for Mac) go
   to `System Settings > Privacy & Security`, find blocked files, then allow `assisted_agg`.
5. Run the test.

Run the `start` script, sit back and relax as a mongo server is started, BaaS is pulled, built and started with a proper configuration 🤞

```shell
npm start
```

Visit the administrative UI in your browser, if you need to.

```shell
open http://localhost:9090
```
