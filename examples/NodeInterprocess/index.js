////////////////////////////////////////////////////////////////////////////
//
// Copyright 2016 Realm Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
////////////////////////////////////////////////////////////////////////////

'use strict';

var express = require('express'),
    winston = require('winston'),
    RealmWinston = require('./winston-realm').Realm;

var app = express();

// Use custom Winston transport: RealmWinston
// Writes log data to winston.realm
winston.add(RealmWinston, {});

app.get('/', function (req, res) {
  res.send('Hello World!');
  winston.info('Handled Hello World');
});

app.use(function (req, res) {
  res.status(404).send('Sorry can not find that!');
  winston.error('404 Error at: ' + req.url);
})

app.listen(3000, function () {
  // eslint-disable-next-line no-console
  console.log('Example app listening on port 3000!');
});

