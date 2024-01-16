////////////////////////////////////////////////////////////////////////////
//
// Copyright 2024 Realm Inc.
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
import assert from "node:assert";
import chalk from "chalk";
import { ExecError, UsageError } from "./helpers";
import { listImages } from "./baasaas";

const BAAS_CONTAINER_NAME = "baas-test-server";
const BAAS_PORT = 9090;
const BAAS_VARIANT = process.arch === "arm64" ? "ubuntu2004-arm64" : "ubuntu2004-docker";
const ECR_HOSTNAME = "969505754201.dkr.ecr.us-east-1.amazonaws.com";

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

export function ensureNodeVersion() {
  const [major] = process.versions.node.split(".");
  const evenMajor = parseInt(major, 10) % 2 === 0;
  assert(evenMajor, "Expected even major Node.js version (requirement of pkg dependency when building translator)");
}

export function ensureDocker() {
  try {
    const version = execSync("docker --version", { encoding: "utf8" }).trim();
    console.log(`Using ${version}`);
  } catch (err) {
    throw new UsageError("Do you have the Docker CLI installed?", { cause: err });
  }
}

export function ensureAWSCli() {
  try {
    const version = execSync("aws --version", { encoding: "utf8" }).trim();
    console.log(`Using ${version}`);
  } catch (err) {
    throw new UsageError("Do you have the AWS CLI installed?", { cause: err });
  }
}

export function ensureNoBaas() {
  const container = execSync(`docker ps -q --filter "name=${BAAS_CONTAINER_NAME}"`, { encoding: "utf8" }).trim();
  if (container) {
    console.log(`Killing existing container (id = ${container})`);
    execSync(`docker kill ${container}`);
  }
}

export async function fetchBaasTag(branch: string) {
  const { allBranches, images } = await listImages();
  const available = images[branch];
  if (available) {
    const firstImage = available.find((image) => {
      return image.buildVariant === BAAS_VARIANT;
    });
    assert(firstImage, `Found no image for the ${BAAS_VARIANT} build variant`);
    return firstImage.imageTag;
  } else {
    throw new Error(`Unexpected branch: Choose from ${JSON.stringify(allBranches)}`);
  }
}

export function pullBaas({ profile, tag }: { profile: string; tag: string }) {
  try {
    execSync(`docker pull ${tag}`, { encoding: "utf8" });
  } catch (err) {
    if (isExecError(err) && err.stderr.includes("Your authorization token has expired")) {
      execSync(`aws --profile ${profile} sso login`, { stdio: "inherit" });
      execSync(
        `aws --profile ${profile} ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ${ECR_HOSTNAME}`,
        { stdio: "inherit" },
      );
    } else {
      throw err;
    }
  }
}

export function spawnBaaS({
  tag,
  accessKeyId,
  secretAccessKey,
}: {
  tag: string;
  accessKeyId: string;
  secretAccessKey: string;
}) {
  console.log("Starting server from tag", chalk.dim(tag));
  spawn(chalk.blueBright("baas"), "docker", [
    "run",
    "--name",
    BAAS_CONTAINER_NAME,
    "-it",
    "--rm",
    "--env",
    `AWS_ACCESS_KEY_ID=${accessKeyId}`,
    "--env",
    `AWS_SECRET_ACCESS_KEY=${secretAccessKey}`,
    "--publish",
    `${BAAS_PORT}:${BAAS_PORT}`,
    tag,
  ]);
}
