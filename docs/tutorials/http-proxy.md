The Realm JavaScript SDK has limited support for running behind an HTTP proxy:

Current limitations:
- This is currently only supported on Realm JS v10.3.0 or higher running on Node.js or Electron.
- You must install the [`fetch-with-proxy`](https://www.npmjs.com/package/fetch-with-proxy) package manually.
- You must set the `HTTPS_PROXY` environment variable, hence the proxy cannot be set at runtime or on a per-app basis.
- HTTPS connections from the client to the proxy server, is not supported. I.e. the URL specified in the `HTTPS_PROXY` must start with `http://`.

## Installing `fetch-with-proxy`

In the time of writing this tutorial a manual step is required to switch out the node-fetch package used by the network transport layer. NPM CLI v6.9.0 or higher is required.

After installing Realm JS, run the following command to install a different package into our Network Transport package:

```
npm install node-fetch@npm:fetch-with-proxy --prefix node_modules/realm-network-transport
```

## Setting `HTTPS_PROXY` and running a script

Let's say you have a `index.js` script that you want to run, while routing all of Realm JS's requests through an HTTP proxy located at `http://127.0.0.1:3128`.

On a Unix system you can simply prefix the assignment of an environment variable before the command, like this:

```
HTTPS_PROXY=http://127.0.0.1:3128 node index.js
```

On a Windows system you have to configure the variable through "Advanced system settings" > "Environment Variables" > "Edit System Variable".
