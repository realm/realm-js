////////////////////////////////////////////////////////////////////////////
//
// Copyright 2021 Realm Inc.
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
"use strict";

var util = require("util"),
  winston = require("winston"),
  Realm = require("realm");

var RealmLogger = (exports.Realm = function (options) {
  winston.Transport.call(this, options);

  //
  // Configure the Realm`
  //
  let LogSchema = {
    name: "Log",
    properties: {
      level: "string",
      message: "string",
      timestamp: "date",
    },
  };

  this.realm = new Realm({
    path: "winston.realm",
    schema: [LogSchema],
  });
});

//
// Inherit from `winston.Transport` so you can take advantage
// of the base functionality and `.handleExceptions()`.
//
util.inherits(RealmLogger, winston.Transport);

//
// Expose the name of this Transport on the prototype
//
RealmLogger.prototype.name = "realm";

//
// Define a getter so that `winston.transports.Realm`
// is available and thus backwards compatible.
//
winston.transports.Realm = RealmLogger;

//
// ### function log (level, msg, [meta], callback)
// #### @level {string} Level at which to log the message.
// #### @msg {string} Message to log
// #### @meta {Object} **Optional** Additional metadata to attach
// #### @callback {function} Continuation to respond to when complete.
// Core logging method exposed to Winston. Metadata is optional.
//
RealmLogger.prototype.log = function (level, msg, meta, callback) {
  let ts = new Date();

  this.realm.write(() => {
    this.realm.create("Log", { level: level, message: msg, timestamp: ts });
  });

  callback(null, true);
};
