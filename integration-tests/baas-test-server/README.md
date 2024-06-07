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

Run the `start` script (calls the CLI's `docker` command), sit back and relax as BaaS is started.

```shell
npm start
# or
npx baas-test-server docker
```

> [!NOTE]  
> This will automatically use the latest local image or pull the latest docker image from AWS ECR as a fallback.

If you want to pull and run the latest available BaaS, run:

```shell
npm run start-latest
# or
npx baas-test-server docker --pull-latest
```

If you want to pull and run form a specific git commit hash of the BaaS repository, run:

```shell
npm start -- 3597df8f7f0375860f2c3c53435d80d4eaa3e976
# or
npx baas-test-server docker 3597df8f7f0375860f2c3c53435d80d4eaa3e976
```

Where `3597df8f7f0375860f2c3c53435d80d4eaa3e976` in the example above is a commit on the baas `master` branch.

## Once BaaS is running locally

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

Run the `baasaas:start` script (calls the CLI's `baasaas start` command), sit back and relax as BaaS is started remotely.

```shell
npm run baasaas:start
# or
npx baas-test-server baasaas start
```