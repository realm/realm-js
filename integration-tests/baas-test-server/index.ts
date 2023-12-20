////////////////////////////////////////////////////////////////////////////
//
// Copyright 2022 Realm Inc.
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

import cp, { execSync } from "node:child_process";
import chalk from "chalk";
import dotenv from "dotenv";
import assert from "node:assert";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

const IMAGES_ENDPOINT = "https://us-east-1.aws.data.mongodb-api.com/app/baas-container-service-autzb/endpoint/images";
const ECR_HOSTNAME = "969505754201.dkr.ecr.us-east-1.amazonaws.com";

const BAAS_CONTAINER_NAME = "baas-test-server";
const BAAS_PORT = 9090;

dotenv.config();

const { AWS_PROFILE, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY } = process.env;
assert(AWS_PROFILE, "Missing AWS_PROFILE env");
assert(AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY, "Missing AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY env");

class UsageError extends Error {}

type ExecError = {
  stdout: string;
  stderr: string;
} & Error;

function isExecError(value: unknown): value is ExecError {
  return (
    value instanceof Error &&
    "stdout" in value &&
    typeof value.stdout === "string" &&
    "stderr" in value &&
    typeof value.stderr === "string"
  );
}

function registerExitListeners(logPrefix: string, child: cp.ChildProcess) {
  function killChild() {
    console.log(logPrefix, chalk.dim(`Sending SIGKILL to pid ${child.pid}`));
    child.kill("SIGKILL");
  }

  process.on("SIGINT", killChild);
  process.on("exit", killChild);
}

function spawn(logPrefix: string, command: string, args: string[] = [], options: cp.SpawnOptions = {}) {
  const child = cp.spawn(command, args, { ...options, stdio: ["inherit", "inherit", "inherit"] });
  registerExitListeners(logPrefix, child);
}

function ensureNodeVersion() {
  const [major] = process.versions.node.split(".");
  const evenMajor = parseInt(major, 10) % 2 === 0;
  assert(evenMajor, "Expected even major Node.js version (requirement of pkg dependency when building translator)");
}

function ensureDocker() {
  try {
    const version = execSync("docker --version", { encoding: "utf8" }).trim();
    console.log(`Using ${version}`);
  } catch (err) {
    throw new UsageError("Do you have the Docker CLI installed?", { cause: err });
  }
}

function ensureAWSCli() {
  try {
    const version = execSync("aws --version", { encoding: "utf8" }).trim();
    console.log(`Using ${version}`);
  } catch (err) {
    throw new UsageError("Do you have the AWS CLI installed?", { cause: err });
  }
}

function ensureNoBaas() {
  const container = execSync(`docker ps -q --filter "name=${BAAS_CONTAINER_NAME}"`, { encoding: "utf8" }).trim();
  if (container) {
    console.log(`Killing existing container (id = ${container})`);
    execSync(`docker kill ${container}`);
  }
}

type Image = {
  buildVariant: string;
  imageTag: string;
  /*
  _id: string;
  project: string;
  order: number;
  versionId: string;
  taskId: string;
  execution: number;
  timestamp: string;
  branch: string;
  revision: string;
  */
};

function assertImage(value: unknown): asserts value is Image {
  assert(typeof value === "object" && value !== null);
  const object = value as Record<string, unknown>;
  assert(typeof object.buildVariant === "string");
  assert(typeof object.imageTag === "string");
}

type ImagesResponse = {
  allBranches: string[];
  images: Record<string, undefined | Image[]>;
};

function assertImagesResponse(value: unknown): asserts value is ImagesResponse {
  assert(typeof value === "object" && value !== null);
  const object = value as Record<string, unknown>;
  assert(Array.isArray(object.allBranches));
  const { images } = object;
  assert(typeof images === "object" && images !== null);
  for (const available of Object.values(images)) {
    assert(Array.isArray(available));
    for (const image of available) {
      assertImage(image);
    }
  }
}

function getBuildVariant() {
  if (process.arch === "arm64") {
    return "ubuntu2004-arm64";
  } else {
    return "ubuntu2004-docker";
  }
}

async function fetchBaasTag(branch: string) {
  const expectedBuildVariant = getBuildVariant();
  const response = await fetch(IMAGES_ENDPOINT);
  assert(response.ok);
  const json = await response.json();
  assertImagesResponse(json);
  const { allBranches, images } = json;
  const available = images[branch];
  if (available) {
    const firstImage = available.find((image) => {
      return image.buildVariant === expectedBuildVariant;
    });
    assert(firstImage, `Found no image for the ${expectedBuildVariant} build variant`);
    return firstImage.imageTag;
  } else {
    throw new Error(`Unexpected branch: Choose from ${JSON.stringify(allBranches)}`);
  }
}

function pullBaas(tag: string) {
  try {
    execSync(`docker pull ${tag}`, { encoding: "utf8" });
  } catch (err) {
    if (isExecError(err) && err.stderr.includes("Your authorization token has expired")) {
      execSync(`aws --profile ${AWS_PROFILE} sso login`, { stdio: "inherit" });
      execSync(
        `aws --profile ${AWS_PROFILE} ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ${ECR_HOSTNAME}`,
        { stdio: "inherit" },
      );
    } else {
      throw err;
    }
  }
}

function spawnBaaS(tag: string) {
  console.log("Starting server from tag", chalk.dim(tag));
  spawn(chalk.blueBright("baas"), "docker", [
    "run",
    "--name",
    BAAS_CONTAINER_NAME,
    "-it",
    "--rm",
    "--env",
    `AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}`,
    "--env",
    `AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}`,
    "--publish",
    `${BAAS_PORT}:${BAAS_PORT}`,
    tag,
  ]);
}

yargs(hideBin(process.argv))
  .command(
    ["run [tag]", "$0 [tag]"],
    "Runs the BaaS test image using Docker",
    (yargs) => yargs.positional("tag", { type: "string" }).option("branch", { default: "master" }),
    async (argv) => {
      try {
        ensureNodeVersion();
        ensureDocker();
        ensureAWSCli();
        ensureNoBaas();

        if (argv.tag) {
          spawnBaaS(argv.tag);
        } else {
          const tag = await fetchBaasTag(argv.branch);
          pullBaas(tag);
          spawnBaaS(tag);
        }
      } catch (err) {
        console.error();
        if (err instanceof UsageError) {
          console.error(chalk.red(err.message));
        } else if (err instanceof Error) {
          console.error(chalk.red(err.stack));
        } else {
          throw err;
        }
      }
    },
  )
  .demandCommand(1)
  .parse();
