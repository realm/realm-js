#!/usr/bin/env tsx

/* eslint header/header: 0 */

import chalk from "chalk";
import dotenv from "dotenv";
import assert from "node:assert";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import waitFor from "p-wait-for";
import gha from "@actions/core";

import * as docker from "./docker";
import * as baasaas from "./baasaas";
import { UsageError } from "./helpers";

const GITHUB_ACTIONS = process.env.GITHUB_ACTIONS === "true";
const WAIT_FOR_SERVER_TIMEOUT = 2 * 60 * 1000;

// Loading .env from the package directory
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({
  path: path.resolve(__dirname, ".env"),
});

// Loading a .env from cwd too
dotenv.config();

function abbreviateId(id: string) {
  return id.split("/").pop();
}

export function wrapCommand<Argv>(command: (argv: Argv) => Promise<void>): (argv: Argv) => void {
  return function (argv: Argv) {
    command(argv).catch((err) => {
      process.exitCode = 1;
      console.error();
      if (err instanceof UsageError) {
        console.error(chalk.red(err.message));
      } else if (err instanceof Error) {
        console.error(chalk.red(err.stack));
      } else {
        throw err;
      }
    });
  };
}

async function printUserInfo() {
  const info = await baasaas.userinfo();
  if (typeof info.data.name === "string") {
    console.log(chalk.dim(`Authenticated as '${info.data.name}'`));
  }
}

async function waitForContainerUrls(id: string, interval = 2000, timeout = 60000) {
  return waitFor(
    async () => {
      const { httpUrl, mongoUrl } = await baasaas.containerStatus(id);
      return typeof httpUrl === "string" && typeof mongoUrl === "string" && waitFor.resolveWith({ httpUrl, mongoUrl });
    },
    { interval, timeout },
  );
}

async function waitForServer(baseUrl: string, interval = 2000, timeout = WAIT_FOR_SERVER_TIMEOUT) {
  return waitFor(
    async () => {
      try {
        const url = new URL("/api/private/v1.0/version", baseUrl);
        const response = await fetch(url, { signal: AbortSignal.timeout(interval - 100) });
        return response.ok;
      } catch (err) {
        return false;
      }
    },
    { interval, timeout },
  );
}

yargs(hideBin(process.argv))
  .command(
    ["docker [githash]"],
    "Runs the BaaS test image using Docker",
    (yargs) => yargs.positional("githash", { type: "string" }).option("branch", { default: "master" }),
    wrapCommand(async (argv) => {
      const { AWS_PROFILE, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY } = process.env;
      assert(AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY, "Missing AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY env");

      docker.ensureNodeVersion();
      docker.ensureDocker();
      docker.ensureAWSCli();
      docker.ensureNoBaas();

      if (argv.githash) {
        docker.spawnBaaS({ tag: argv.githash, accessKeyId: AWS_ACCESS_KEY_ID, secretAccessKey: AWS_SECRET_ACCESS_KEY });
      } else {
        const tag = await docker.fetchBaasTag(argv.branch);
        assert(AWS_PROFILE, "Missing AWS_PROFILE env");
        docker.pullBaas({ profile: AWS_PROFILE, tag });
        docker.spawnBaaS({ tag, accessKeyId: AWS_ACCESS_KEY_ID, secretAccessKey: AWS_SECRET_ACCESS_KEY });
      }
    }),
  )
  .command(["baasaas <command>"], "Manage the BaaSaaS service", (yargs) =>
    yargs
      .command(
        ["list"],
        "List running containers on the BaaSaaS service",
        (yargs) => yargs.boolean("mine"),
        wrapCommand(async (argv) => {
          await printUserInfo();
          const containers = await baasaas.listContainers(argv.mine);
          if (argv.mine && containers.length === 0) {
            console.log("You have no containers running");
          } else if (containers.length === 0) {
            console.log("There are no containers running");
          } else if (argv.mine) {
            console.log("Your containers:");
          } else {
            console.log("All containers:");
          }
          for (const { id, createdAt, creatorName } of containers) {
            console.log(`→ ${abbreviateId(id)} ${chalk.dim(`(created ${createdAt} by ${creatorName})`)}`);
          }
        }),
      )
      .command(
        ["start [githash]"],
        "Start a container on the BaaSaaS service",
        (yargs) =>
          yargs
            .positional("githash", { type: "string", default: gha.getInput("githash") ?? undefined })
            .option("branch", { default: gha.getInput("branch") || "master" }),
        wrapCommand(async (argv) => {
          await printUserInfo();
          const container = await baasaas.startContainer(
            argv.githash ? { githash: argv.githash } : { branch: argv.branch },
          );

          console.log(`Started container (id = ${abbreviateId(container.id)})`);
          const { httpUrl, mongoUrl } = await waitForContainerUrls(container.id);
          console.log(`Server listening on ${httpUrl}`);
          console.log(`MongoDB listening on ${mongoUrl}`);
          console.log("Server is getting ready for connections ...");
          await waitForServer(httpUrl);
          console.log("Server is ready 🤘");

          if (GITHUB_ACTIONS) {
            gha.notice(`Server listening on ${httpUrl}`, { title: "Started BaaS server" });
            // Useful when called from a wrapper action
            gha.saveState("CONTAINER_ID", container.id);
            gha.setOutput("container-id", container.id);
            gha.setOutput("baas-url", httpUrl);
            gha.setOutput("mongo-url", mongoUrl);
          }
        }),
      )
      .command(
        ["stop [id]"],
        "Stop a container running on the BaaSaaS service",
        (yargs) => yargs.positional("id", { type: "string" }),
        wrapCommand(async ({ id = gha.getState("CONTAINER_ID") }) => {
          await printUserInfo();
          if (GITHUB_ACTIONS && !id) {
            console.log("Skipped stopping container, since an id could not be determined.");
            return;
          }

          if (id) {
            if (id === "all" || id === "mine" || id === "*") {
              console.log(`Stopping all your containers:`);
              const containers = await baasaas.listContainers(true);
              for (const container of containers) {
                console.log(`→ Stopping container '${abbreviateId(container.id)}'`);
                await baasaas.stopContainer(container.id);
              }
            } else {
              console.log(`Stopping container '${abbreviateId(id)}'`);
              await baasaas.stopContainer(id);
            }
          } else {
            const containers = await baasaas.listContainers(true);
            if (containers.length === 0) {
              throw new UsageError("You have no containers running");
            } else if (containers.length === 1) {
              const [container] = containers;
              console.log(`Stopping container '${abbreviateId(container.id)}'`);
              await baasaas.stopContainer(container.id);
            } else {
              const ids = containers
                .map(({ id, createdAt }) => `→ ${abbreviateId(id)} ${chalk.dim(`(created ${createdAt})`)}`)
                .join("\n");
              throw new UsageError(`You have more than one container running, please run with an id:\n${ids}`);
            }
          }
        }),
      ),
  )
  .demandCommand(1)
  .parse();
