#!/usr/bin/env tsx

/* eslint header/header: 0 */

import dotenv from "dotenv";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { DockerCommandArgv, dockerCommand } from "./docker";
import { wrapCommand } from "./helpers";

dotenv.config();

yargs(hideBin(process.argv))
  .command<DockerCommandArgv>(
    ["docker [tag]"],
    "Runs the BaaS test image using Docker",
    (yargs) => yargs.positional("tag", { type: "string" }).option("branch", { default: "master" }),
    wrapCommand(dockerCommand),
  )
  .demandCommand(1)
  .parse();
