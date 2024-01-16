# Run BaaS from source

We're using an NPM workspace mono-repository, so first you need to install dependencies from the package root:

```shell
npm install
```

Create a `.env` file with your `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` secrets.
Ask your team how to get these.

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
