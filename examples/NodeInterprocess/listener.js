'use strict';

var Realm = require('realm');

let winstonRealm = new Realm({
  path: 'winston.realm'
});

// Register listener to print out log messages at error level
winstonRealm.objects('Log').filtered('level = "error"').addListener((logs, changes) => {
  changes.insertions.map((index) => {
    let log = logs[index];
    console.log(log.message);
  })
});

