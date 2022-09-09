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

Run the `start` script, sit back and relax as a mongo server is started, BaaS is pulled, built and started with a proper configuration 🤞

```shell
npm start
```

Visit the administrative UI in your browser, if you need to.

```shell
open http://localhost:9090
```
