#!/usr/bin/env node --loader tsm --no-warnings --
import { program } from "./src/program";
program.parse(process.argv);
