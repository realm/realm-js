#!/usr/bin/env node
// The main purpose of this file is provide the shebang on the first line of this file
// and persist the executable permission.
const { program } = require("./dist/scripts/build");
program.parse();
