# Tiny Example App for Measuring Performance of Realm Web Sync

## Prerequisites

* Node.js

## Install dependencies

```sh
npm i
```

## Run

After running the following command, your default browser should open automatically. If not, navigate to [http://localhost:3000](http://localhost:3000).

```sh
npm start
```

> ⚠️ The wasm sync implementation is not yet integrated. Until then, the Realm-related code in [App.tsx](https://github.com/realm/realm-js/blob/lj/wasm/web-sync/example-web-sync/client/src/App.tsx) need to be commented out before running.
