# Logging - React Native SDK
You can set or change your app's log level to develop or debug your
application. You might want to change the log level to log different
amounts of data depending on the app's environment. You can specify
different log levels or custom loggers.

## Set or Change the Realm Log Level
You can set the level of detail reported by the Realm React Native SDK. To
configure the log level, pass a valid level string value to
`setLogLevel()`:

- "all"
- "trace"
- "debug"
- "detail"
- "info"
- "warn"
- "error"
- "fatal"
- "off"

```typescript
Realm.setLogLevel('trace');
```

Use `setLogLevel()` anywhere in your app to increase or decrease log verbosity
at different points in your code.

To turn off logging, pass "off" to `setLogLevel()`:

```typescript
Realm.setLogLevel('off');
```

## Customize the Logger
To set a custom logger, call `setLogger()`.
This method receives `level` and `message` arguments from the Realm logger,
not individual realms. Use these arguments to define your own logging behavior.

You must use `setLogger()` before you open a realm with `RealmProvider`.
You can't use `setLogger()` in a hook in the same component as
`RealmProvider` because `RealmProvider` opens a realm when it is mounted.
Hooks generally run after a component is mounted, which means `RealmProvider`
already opened a realm.

Most of the time, you should set your custom logger outside of the React tree.
For example, in your app's root `index.js` file.

```typescript
Realm.setLogger((level, message) => {
  const log = {
    message,
    level,
  };

  setLogs(previousLogs => [...previousLogs, log]);
});
```

This sets the logging behavior for all Realm logging in your application,
regardless of where you set it. If you do not provide a log level, the default
is "info".
