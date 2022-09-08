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
import path from "path";
import fs from "fs";
import chalk from "chalk";
import dotenv from "dotenv";
import assert from "node:assert";
import { Socket } from "node:net";

const MONGO_CONTAINER_NAME = "mongo";
const STITCH_SUPPORT_URL =
  "https://mciuploads.s3.amazonaws.com/mongodb-mongo-master-nightly/stitch-support/macos-arm64/796351fa200293a91413699c8da073eb314ac2cd/stitch-support-6.1.0-alpha-527-g796351f.tgz";
// This can be updated once https://github.com/10gen/baas/pull/7405 gets merged
const BAAS_REPO = "git@github.com:kraenhansen/baas.git";

dotenv.config();

const currentDirPath = path.dirname(new URL(import.meta.url).pathname);
const baasPath = path.resolve(currentDirPath, "baas");
const dylibPath = path.resolve(baasPath, "etc/dylib");
const transpilerPath = path.resolve(baasPath, "etc/transpiler");
const transpilerBinPath = path.resolve(transpilerPath, "bin");
const baasTmpPath = path.resolve(baasPath, "tmp");
const dylibFilename = "libstitch_support.dylib";
const dylibUsrLocalLibPath = "/usr/local/lib/" + dylibFilename;

function sleep(ms = 1000) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function ensureOsAndArch() {
  assert.equal(process.platform, "darwin", "This script is intended for a mac");
  assert.equal(process.arch, "arm64", "This script is intended for an arm 64 mac");
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
    // Clone the baas repository
    execSync("git clone --depth=1 --branch kh/translator-pkg-upgraded git@github.com:kraenhansen/baas.git baas", {
      stdio: "inherit",
    });
  }
}

function getBaasCommit() {
  return execSync("git rev-parse HEAD", { cwd: baasPath, encoding: "utf8" }).trim();
}

function getGoVersion() {
  return execSync("go version", { cwd: baasPath, encoding: "utf8" }).trim();
}

function ensureBaasRepo() {
  try {
    const commit = getBaasCommit();
    console.log(`Using BaaS ${commit}`);
  } catch (err) {
    // Clone the baas repository
    execSync(`git clone --depth=1 --branch kh/translator-pkg-upgraded ${BAAS_REPO} baas`, {
      stdio: "inherit",
    });
  }
}

function ensureGo() {
  try {
    const version = getGoVersion();
    console.log(`Using Go ${version}`);
  } catch (err) {
    throw new Error("Missing 'go': https://github.com/10gen/baas/blob/master/etc/docs/onboarding.md#go");
  }
}

function ensureBaasDylib() {
  if (!fs.existsSync(dylibPath) || !fs.existsSync(dylibPath)) {
    console.log("Missing the etc/dylib - downloading!");
    fs.mkdirSync(dylibPath, { recursive: true });
    // Download and untar
    execSync(`curl -s "${STITCH_SUPPORT_URL}" | tar xvfz - --strip-components=1`, { cwd: dylibPath, stdio: "inherit" });
  }
  if (!fs.existsSync(dylibUsrLocalLibPath)) {
    console.log(`Missing the ${dylibUsrLocalLibPath} - linking! (will ask for your sudo password)`);
    const existingPath = path.resolve(dylibPath, "lib", dylibFilename);
    execSync(`sudo ln -s '${existingPath}' '${dylibUsrLocalLibPath}'`);
  }
}

function ensureBaasTranspiler() {
  if (!fs.existsSync(transpilerBinPath)) {
    console.log("Missing the etc/transpiler binary - building!");
    execSync("yarn", { cwd: transpilerPath, stdio: "inherit" });
    execSync("yarn build", { cwd: transpilerPath, stdio: "inherit" });
  }
}

function ensureBaasTmpDir() {
  if (!fs.existsSync(baasTmpPath)) {
    console.log("Missing the tmp directory - creating!");
    fs.mkdirSync(baasTmpPath, { recursive: true });
  }
}

function ensureBaasAwsCredentials() {
  const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY } = process.env;
  if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
    throw new Error("Missing AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY env");
  }
}

function ensureNoMongoDB() {
  execSync(`docker rm -f ${MONGO_CONTAINER_NAME}`);
}

async function connectToServer(port: number) {
  return new Promise((resolve, reject) => {
    const socket = new Socket();
    socket.once("connect", resolve);
    socket.once("error", reject);
    socket.connect(port);
  });
}

async function waitForServer(port: number) {
  for (let retry = 0; retry < 100; retry++) {
    try {
      await connectToServer(port);
    } catch (err) {
      if (err instanceof Error && err.message.includes("ECONNREFUSED")) {
        await sleep();
      } else {
        throw err;
      }
    }
  }
}

async function spawnMongoDB() {
  spawn(chalk.greenBright("mongo"), "docker", [
    "run",
    "--name",
    MONGO_CONTAINER_NAME,
    // Setting hostname to localhost to enable connecting without a direct connection
    "--hostname",
    "localhost",
    "-it",
    "--rm",
    "--publish",
    "26000:26000",
    "mongo",
    "mongod",
    "--replSet",
    "local",
    "--port",
    "26000",
    // Ask it to bind to localhost too
    "--bind_ip",
    "localhost",
  ]);
  // Wait for the server to appear
  await waitForServer(26000);
  console.log("MongoDB is ready! 🚀 Initializing mongo replicasets");
  execSync(`docker exec ${MONGO_CONTAINER_NAME} mongosh mongodb://localhost:26000 --eval 'rs.initiate()'`, {
    stdio: "inherit",
  });
}

function ensureBaasAdminUser() {
  // Create a user
  execSync(
    "go run cmd/auth/user.go addUser -domainID 000000000000000000000000 -mongoURI mongodb://localhost:26000 -salt 'DQOWene1723baqD!_@#' -id 'unique_user@domain.com' -password 'password'",
    { cwd: baasPath, stdio: "inherit" },
  );
}

function spawnBaaS() {
  // Build and run the BaaS binary - we're doing this over "go run" because that doesn't propagate a kill signal
  // Build a binary
  execSync("go build -o baas_server cmd/server/main.go", { cwd: baasPath, stdio: "inherit" });
  spawn(chalk.blueBright("baas"), "./baas_server", ["--configFile", "./etc/configs/test_config.json"], {
    cwd: baasPath,
    env: { ...process.env, PATH: process.env.PATH + ":" + transpilerBinPath },
  });
}

try {
  ensureOsAndArch();
  ensureNodeVersion();
  ensureDocker();
  ensureBaasRepo();
  ensureGo();
  ensureBaasDylib();
  ensureBaasTranspiler();
  ensureBaasTmpDir();
  ensureBaasAwsCredentials();
  ensureNoMongoDB();
  await spawnMongoDB();
  ensureBaasAdminUser();
  spawnBaaS();
} catch (err) {
  console.error("\n💥 Failure!");
  if (err instanceof Error) {
    console.error(chalk.red(err.message));
    console.error(chalk.dim(err.stack));
  } else {
    throw err;
  }
}
