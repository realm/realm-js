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
import streamChain from "stream-chain";
import streamJson from "stream-json";
import streamValues from "stream-json/streamers/StreamValues";

const MONGO_CONTAINER_NAME = "mongo";
const STITCH_SUPPORT_URL =
  "https://mciuploads.s3.amazonaws.com/mongodb-mongo-master-nightly/stitch-support/macos-arm64/796351fa200293a91413699c8da073eb314ac2cd/stitch-support-6.1.0-alpha-527-g796351f.tgz";
// This can be updated once https://github.com/10gen/baas/pull/7405 gets merged
const BAAS_REPO = "git@github.com:10gen/baas.git";
const BAAS_UI_REPO = "git@github.com:10gen/baas-ui.git";
const MONGODB_PORT = 26000;
const MONGODB_URL = `mongodb://localhost:${MONGODB_PORT}`;
const ASSISTED_AGG_URL =
  "https://stitch-artifacts.s3.amazonaws.com/stitch-mongo-libs/stitch_mongo_libs_osx_patch_df9a68d900d7faddcee16bf0f532437da815a1c3_63289ac95623436dd66f7056_22_09_19_16_37_32/assisted_agg";

const DEFAULT_STDIO: Array<cp.IOType> = ["inherit", "inherit", "inherit"];

dotenv.config();

const currentDirPath = path.dirname(new URL(import.meta.url).pathname);
const baasPath = path.resolve(currentDirPath, "baas");
const staticPath = path.resolve(baasPath, "static");
const staticAppPath = path.resolve(staticPath, "app");
const dylibPath = path.resolve(baasPath, "etc/dylib");
const transpilerPath = path.resolve(baasPath, "etc/transpiler");
const transpilerBinPath = path.resolve(transpilerPath, "bin");
const baasTmpPath = path.resolve(baasPath, "tmp");
const dylibFilename = "libstitch_support.dylib";
const dylibUsrLocalLibPath = "/usr/local/lib/" + dylibFilename;
const assistedAggPath = path.resolve(baasPath, "assisted_agg");

function sleep(ms = 1000) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function registerExitListeners(logPrefix: string, child: cp.ChildProcess) {
  function killChild() {
    console.log(logPrefix, chalk.dim(`Sending SIGKILL to pid ${child.pid}`));
    // Avoid calling it more than once
    process.off("SIGINT", killChild);
    process.off("exit", killChild);
    // Kill the child process
    child.kill("SIGKILL");
  }

  process.on("SIGINT", killChild);
  process.on("exit", killChild);
}

function transformMongoJson({ value }: { value: unknown }): string {
  if (typeof value === "object" && value !== null) {
    const severity = "s" in value && typeof value.s === "string" ? value.s : "?";
    const msg = "msg" in value && typeof value.msg === "string" ? value.msg : "";
    const context = "c" in value && typeof value.c === "string" ? value.c : "-";

    const severityPrefix = chalk.dim(`[${severity}]`);
    const contextSuffix = context !== "-" ? chalk.dim(`(${context})`) : "";
    return `${severityPrefix} ${msg} ${contextSuffix}\n`;
  } else {
    throw new Error("Expected a stream of JSON objects");
  }
}

function spawn(
  logPrefix: string,
  command: string,
  args: string[] = [],
  options: cp.SpawnOptions = {},
  transformJson?: ({ value }: { value: unknown }) => string,
) {
  const child = cp.spawn(command, args, { ...options, stdio: ["inherit", "pipe", "inherit"] });
  console.log(logPrefix, `Spawned '${command} ${args.join(" ")}' (pid = ${child.pid})`);
  registerExitListeners(logPrefix, child);
  const addPrefix = (chunk: Buffer | string) => {
    const content = typeof chunk === "string" ? chunk : chunk.toString();
    // Prefix every line with the log prefix
    const lines = content
      .trim()
      .split("\n")
      .map((line) => `${logPrefix} ${line}`)
      .join("\n");
    return lines + "\n";
  };
  const pipeline = streamChain.chain(
    transformJson
      ? [
          streamJson.parser({ jsonStreaming: true }),
          streamValues.streamValues(),
          transformJson,
          addPrefix,
          process.stdout,
        ]
      : [addPrefix, process.stdout],
    {},
  );
  pipeline.on("error", (err) => console.error(err));
  child.stdout.pipe(pipeline);
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
      stdio: DEFAULT_STDIO,
    });
  }
}

function getHeadCommit(cwd: string) {
  return execSync("git rev-parse HEAD", { cwd, encoding: "utf8" }).trim();
}

function getGoVersion() {
  return execSync("go version", { encoding: "utf8" }).trim();
}

function ensureBaasRepo() {
  try {
    const commit = getHeadCommit(baasPath);
    console.log(`Using BaaS ${commit}`);
  } catch (err) {
    if (err instanceof Error && err.message.includes("ENOENT")) {
      // Clone the baas repository
      execSync(`git clone --depth=1 ${BAAS_REPO} baas`, {
        stdio: DEFAULT_STDIO,
      });
    } else {
      throw err;
    }
  }
}

function ensureBaasUIRepo() {
  if (!fs.existsSync(staticPath)) {
    console.log("Missing the static directory - creating!");
    fs.mkdirSync(staticPath, { recursive: true });
  }
  try {
    const commit = getHeadCommit(staticAppPath);
    console.log(`Using BaaS UI ${commit}`);
  } catch (err) {
    if (err instanceof Error && err.message.includes("ENOENT")) {
      // Clone the baas ui repository
      execSync(`git clone --depth=1 ${BAAS_UI_REPO} app`, {
        cwd: staticPath,
        stdio: DEFAULT_STDIO,
      });
    } else {
      throw err;
    }
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
    execSync(`curl -s "${STITCH_SUPPORT_URL}" | tar xvfz - --strip-components=1`, {
      cwd: dylibPath,
      stdio: DEFAULT_STDIO,
    });
  }
  if (!fs.existsSync(dylibUsrLocalLibPath)) {
    console.log(`Missing the ${dylibUsrLocalLibPath} - linking! (will ask for your sudo password)`);
    const existingPath = path.resolve(dylibPath, "lib", dylibFilename);
    execSync(`sudo ln -sf '${existingPath}' '${dylibUsrLocalLibPath}'`);
  }
}

function ensureBaasAssistedAgg() {
  if (!fs.existsSync(assistedAggPath)) {
    console.log("Missing assisted_agg - downloading!");
    execSync(`curl -s "${ASSISTED_AGG_URL}" --output assisted_agg`, { cwd: baasPath, stdio: DEFAULT_STDIO });
  }
  // Ensure it's executable
  execSync(`chmod u+x "${assistedAggPath}"`);
}

function ensureBaasTranspiler() {
  if (!fs.existsSync(transpilerBinPath)) {
    console.log("Missing the etc/transpiler binary - building!");
    execSync("yarn", { cwd: transpilerPath, stdio: DEFAULT_STDIO });
    execSync("yarn build", { cwd: transpilerPath, stdio: DEFAULT_STDIO });
  }
}

function patchBaasUIPackageJson() {
  // Patch the package.json - remove once https://github.com/10gen/baas-ui/pull/2705 is merged
  const packageJsonPath = path.resolve(staticAppPath, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, { encoding: "utf8" }));
  // Nuke the preinstall script
  delete packageJson.scripts.preinstall;
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
}

function ensureBaasUI() {
  const distPath = path.resolve(staticAppPath, "dist/static");
  if (!fs.existsSync(distPath)) {
    console.log("Missing the UI dist - building!");
    patchBaasUIPackageJson();
    execSync("yarn && yarn build", { cwd: staticAppPath, stdio: DEFAULT_STDIO });
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
  execSync(`docker rm -f ${MONGO_CONTAINER_NAME}`, { stdio: "ignore" });
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
  spawn(
    chalk.greenBright("mongo"),
    "docker",
    [
      "run",
      "--name",
      MONGO_CONTAINER_NAME,
      // Setting hostname to localhost to enable connecting without a direct connection
      "--hostname",
      "localhost",
      "--interactive",
      "--rm",
      "--publish",
      `${MONGODB_PORT}:${MONGODB_PORT}`,
      "mongo",
      "mongod",
      "--replSet",
      "local",
      "--port",
      MONGODB_PORT.toString(),
      // Ask it to bind to localhost too
      "--bind_ip",
      "localhost",
    ],
    {},
    transformMongoJson,
  );
  // Wait for the server to appear
  await waitForServer(MONGODB_PORT);
  console.log("MongoDB is ready! 🚀 Initializing mongo replicasets");
  execSync(
    `docker exec ${MONGO_CONTAINER_NAME} mongosh ${MONGODB_URL} --quiet --eval 'disableTelemetry(); rs.initiate()'`,
    {
      stdio: DEFAULT_STDIO,
    },
  );
}

function ensureBaasAdminUser() {
  // Create a user
  execSync(
    `go run cmd/auth/user.go addUser -domainID 000000000000000000000000 -mongoURI ${MONGODB_URL} -salt 'DQOWene1723baqD!_@#' -id 'unique_user@domain.com' -password 'password'`,
    { cwd: baasPath, stdio: DEFAULT_STDIO },
  );
}

function spawnBaaS() {
  // Build and run the BaaS binary - we're doing this over "go run" because that doesn't propagate a kill signal
  // Build a binary
  console.log("Building BaaS server", { transpilerBinPath });
  execSync("go build -o baas_server cmd/server/main.go", { cwd: baasPath, stdio: DEFAULT_STDIO });
  spawn(chalk.blueBright("baas"), "./baas_server", ["--configFile", "./etc/configs/test_config.json"], {
    cwd: baasPath,
    env: { ...process.env, PATH: [path.dirname(assistedAggPath), transpilerBinPath, process.env.PATH].join(":") },
  });
}

try {
  ensureOsAndArch();
  ensureNodeVersion();
  ensureDocker();
  ensureGo();

  ensureBaasRepo();
  ensureBaasUIRepo();

  ensureBaasDylib();
  ensureBaasAssistedAgg();
  ensureBaasTranspiler();
  ensureBaasUI();
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
