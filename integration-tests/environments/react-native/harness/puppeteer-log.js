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

// Inspired by
// https://stackoverflow.com/questions/51676159/puppeteer-console-log-how-to-look-inside-jshandleobject/66801550#66801550

const chalk = require('chalk');
const puppeteer = require('puppeteer');

const COLORS = {
  log: chalk.gray,
  error: chalk.red,
  warning: chalk.yellow,
};

function serializeArg(arg) {
  if (typeof arg.evaluate === "function") {
    return arg.evaluate(value => {
      if (value instanceof Error) {
        return value.stack;
      } else if (value && value.toString === "function") {
        return value.toString();
      } else {
        return value;
      }
    });
  } else {
    throw new Error("Expected a JSHandle with an evaluate function");
  }
}

async function handleConsole(msg) {
  const args = await Promise.all(msg.args().map(serializeArg));
  const type = msg.type();
  const color = COLORS[type] || chalk.white;
  const log = console[type] || console.log;
  log(color(`[chrome:${type}]`), ...args);
}

module.exports = { handleConsole };
