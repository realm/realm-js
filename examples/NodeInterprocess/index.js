var express = require('express'),
    util = require('util'),
    winston = require('winston');
    RealmWinston = require('./winston-realm').Realm;

var app = express();

// Use custom Winston transport: RealmWinston
// Writes log data to winston.realm
winston.add(RealmWinston, {});

app.get('/', function (req, res) {
  res.send('Hello World!');
  winston.info('Handled Hello World');
});

app.use(function (req, res, next) {
  res.status(404).send('Sorry can not find that!');
  winston.error('404 Error at: ' + req.url);
})

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});

