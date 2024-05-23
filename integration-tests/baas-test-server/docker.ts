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
import { UsageError } from "./helpers";
import { listImages } from "./baasaas/client";

const BAAS_CONTAINER_NAME = "baas-test-server";
const BAAS_PORT = 9090;
const BAAS_VARIANT = process.arch === "arm64" ? "ubuntu2004-arm64" : "ubuntu2004-docker";
const ECR_HOSTNAME = "969505754201.dkr.ecr.us-east-1.amazonaws.com";
const ECR_PATHNAME = "/baas-test-images/test_server-race";

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

export function getLatestLocalId() {
  const imagesOutput = execSync("docker images --format json", { encoding: "utf8" });
  for (const line of imagesOutput.split("\n")) {
    if (line) {
      const image = JSON.parse(line.trim());
      if (image.Repository === ECR_HOSTNAME + ECR_PATHNAME && image.Tag.startsWith(BAAS_VARIANT)) {
        return image.ID;
      }
    }
  }
  throw new Error("Unable to infer the latest local tag");
}

export function pullBaas({ profile, tag }: { profile: string; tag: string }) {
  try {
    execSync(`docker pull ${tag}`, { stdio: "inherit" });
  } catch (err) {
    // We'll assume that any error pulling the image is related to not being authenticated.
    // Unfortunately, it's not trivial to inherit the stdio and match on the stderr at the same time.
    execSync(`aws --profile ${profile} sso login`, { stdio: "inherit" });
    execSync(
      `aws --profile ${profile} ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ${ECR_HOSTNAME}`,
      { stdio: "inherit" },
    );
  }
}

export function spawnBaaS({
  image,
  accessKeyId,
  secretAccessKey,
}: {
  image: string;
  accessKeyId: string;
  secretAccessKey: string;
}) {
  console.log("Starting server from tag", chalk.dim(image));
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
    image,
  ]);
}
