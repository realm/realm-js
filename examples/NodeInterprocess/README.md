# Realm-JS Interprocess Example
Example of interprocess support using Realm and Node.js

The example makes use of [Winston](https://github.com/winstonjs/winston), a 
logging library, and includes `winston-realm.js` which defines a custom transport
utilizing Realm for storage. The main file, `index.js` is an 
[Express](https://github.com/expressjs/express) app handling HTTP requests. The 
app listens on port 3000 and responds with "Hello World!" at the base path `/` 
and logs at `info` "Handled Hello World" to Winston. At any other path it 
returns a `404` error and logs an error message to Winston with URL in question.

Since the log messages are being stored in a Realm (`winston.realm`), we can 
listen for changes on another process. The `listener.js` is a small example of 
this. When running, this listens to the `winston.realm` for changes and writes 
to the console the latest error level log message.

To test:

1. `npm install`
2. `node .` to run the Express app
3. In another process: `node listener.js`
4. Go to `http://localhost:3000/whatever` to see error message across processes
