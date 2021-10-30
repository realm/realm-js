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

const { createServer } = require("http");
const PORT = 3000;
const EXPECTED_MESSAGE = "Persons are Alice, Bob, Charlie";

createServer((req, res) => {
  console.log("Client connected");
  req.on("data", (data) => {
    const message = data.toString("utf-8");
    res.statusCode = 200;
    res.end();
    console.log(`App sent "${message}"!`);
    if (message === EXPECTED_MESSAGE) {
      console.log("This was expected!");
      process.exit(0);
    } else {
      console.log(`This was unexpected! (expected ${EXPECTED_MESSAGE})`);
      process.exit(1);
    }
  });
}).listen(PORT);

setTimeout(() => {
  console.log("It took too long for the app to send the message");
  process.exit(1);
}, 10000);
