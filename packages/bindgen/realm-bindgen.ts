#!/usr/bin/env -S node --loader tsm --enable-source-maps --no-warnings --
import { program } from "./src/program";
program.parse(process.argv);
