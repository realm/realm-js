#!/usr/bin/env tsx

/* eslint header/header: 0 */

import dotenv from "dotenv";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { DockerCommandArgv, runDocker } from "./docker";
import { wrapCommand } from "./helpers";
import { runBaaSaaS } from "./baasaas";

dotenv.config();

yargs(hideBin(process.argv))
  .command<DockerCommandArgv>(
    ["docker [tag]"],
    "Runs the BaaS test image using Docker",
    (yargs) => yargs.positional("tag", { type: "string" }).option("branch", { default: "master" }),
    wrapCommand(runDocker),
  )
  .command<DockerCommandArgv>(
    ["baasaas"],
    "Runs the BaaS test image using the BaaSaaS service",
    (yargs) => yargs.option("branch", { default: "master" }),
    wrapCommand(runBaaSaaS),
  )
  .demandCommand(1)
  .parse();
