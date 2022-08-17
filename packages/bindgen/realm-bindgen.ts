#!/usr/bin/env -S node --loader tsm --no-warnings --
/* eslint-disable */
import { program } from "./src/program";
program.parse(process.argv);
