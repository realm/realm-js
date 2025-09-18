# Logging - Node.js SDK
You can set or change your app's log level to develop or debug your
application. You might want to change the log level to log different
amounts of data depending on the app's environment. You can specify
different log levels or custom loggers.

## Set or Change the Realm Log Level
You can set the level of detail reported by the Realm Node.js SDK. To configure
the log level, pass `Realm.setLogLevel()` to a valid level string value:

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
Realm.setLogLevel("all");

```

You can set different log levels to increase or decrease verbosity at different
points in your code.

```typescript
// Set a default log level that's not too verbose
Realm.setLogLevel("detail");
const realm = await Realm.open({
  schema: [Turtle],
});

// Later, change the log level to debug an issue when running specific code
Realm.setLogLevel("trace");
realm.write(() => realm.create(Turtle, newTestObject()));

```

## Customize the Logger
To set a custom logger, call `setLogger()`.
This method receives `level` and `message` arguments from the Realm logger.
You can use these arguments to define your own logging behavior.

#### Javascript

```javascript
let logs = [];

Realm.setLogger((level, message) => {
  logs.push({ level, message });
});

```

#### Typescript

```typescript
type Log = {
  message: string;
  level: string;
};
let logs: Log[] = [];

Realm.setLogger((level, message) => {
  logs.push({ level, message });
});

```

This sets the logging behavior for all Realm logging in your application. If you
do not provide a log level, the default value is "info".

## Turn Off Logging
You can turn off logging by setting the log level to `RealmLogLevel.off`:

```typescript
Realm.setLogLevel("off");

```

## Performance and console.log()
You should avoid using `console.log()` in production because it will negatively
affect your app's performance. It can also be hard to account for all of the
method's quirks in Node.js.

For details about `console.log()` behavior, check out the [Node.js docs](https://nodejs.org/api/process.html#a-note-on-process-io).
