# Run a BaaS test server

We're using an NPM workspace mono-repository, so first you need to install dependencies from the package root:

```shell
npm install
```

## Run BaaS locally using docker

Create a `.env` file with your `AWS_PROFILE`, `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` secrets.
Ask your team how to get these.

```shell
# .env
AWS_PROFILE=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

Run the `start` script, sit back and relax as BaaS is pulled and started.

```shell
npx baas-test-server docker
```

Visit the administrative UI in your browser, if you need to.

```shell
open http://localhost:9090
```

## Run BaaS via the BaaSaaS infrastructure

Create a `.env` file with your `BAASAAS_KEY` secrets.
Ask your team how to get these.

```shell
# .env
BAASAAS_KEY=...
```

Run the `start` script, sit back and relax as BaaS is started remotely.

```shell
npx baas-test-server baasaas start
```