const assert = require('assert');
const http = require('http');

const PORT = 1337;

const server = http.createServer((req, res) => {
  console.log(`Received a request "${req.url}"`, req.headers);

  let rawData = '';
  req.on('data', chunk => {
    rawData += chunk;
  });
  req.on('end', () => {
    try {
      const parsedData = JSON.parse(rawData);
      assert.deepEqual(parsedData, {
        people: [{name: 'Alice'}, {name: 'Bob'}, {name: 'Charlie'}],
      });
      res.end();
      process.exit(0);
    } catch (e) {
      process.exit(2);
      console.error(e.stack);
    }
  });
});

server.on('error', err => {
  console.error('Server error', err.stack);
  process.exit(1);
});

server.listen(PORT);
const url = `http://localhost:${PORT}`;
console.log(`Waiting for the app to send a request to ${url}`);
