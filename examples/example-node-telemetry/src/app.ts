////////////////////////////////////////////////////////////////////////////
//
// Copyright 2023 Realm Inc.
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

import * as os from "os";
import { machineId } from "node-machine-id";

import createDebug from "debug";
export const debug = createDebug("realm:telemetry");

import Realm from "realm";
import { MachineInfo } from "./models/machine_info";
import { SensorReading } from "./models/sensor_reading";
import { config } from "./config";

const tenSeconds = 10 * 1000;

/**
 * Samples system's load and memory
 * @returns sensor readings
 */
function readSensorData() {
  const loadAvg = os.loadavg();
  const uptime = os.uptime();
  const freemem = os.freemem();
  return { uptime, freemem, loadAvg };
}

/**
 * Computes a unique identifier for the computer and looks up
 * the platform/operating system and its version/release
 * @returns machine identifier, platform, and version/release
 */
async function readMachineInfo() {
  const identifier = await machineId();
  const platform = os.platform();
  const release = os.release();
  return { identifier, platform, release };
}

async function main() {
  // Initialize the app using the app id. You need to copy it from https://realm.mongodb.com
  const app = new Realm.App(config.appId);
  debug(`App ${config.appId} has been initiated`);
  // We are using an anonymous user, and you can switch to any auth provider if needed
  debug(`Logging in`);
  const user = await app.logIn(Realm.Credentials.anonymous());
  debug(`User ${user.id} has been logged in`);
  // For data ingest (`asymmetric: true` in `SensorReading`) you don't need any
  // subscriptions for flexible sync
  debug("Opening Realm");
  const realm = await Realm.open({
    schema: [SensorReading, MachineInfo],
    sync: {
      flexible: true,
      user,
    },
  });

  // The metadata about the computer will not change
  const machineInfo = await readMachineInfo();
  const intervalId = setInterval(() => {
    const now = new Date();
    const measurement = readSensorData();
    const obj = {
      timestamp: now,
      machineInfo,
      ...measurement,
    };
    debug("Writing new sensor reading");
    realm.write(() => realm.create(SensorReading.name, obj));
  }, tenSeconds);

  // Catch CTRL-C in a nice way
  process.stdin.resume();
  process.on("SIGINT", async () => {
    debug("Shutting down.");
    debug("Remove periodic sensor readings");
    clearInterval(intervalId);
    debug("Sync any outstanding changes");
    await realm.syncSession?.uploadAllLocalChanges();
    debug("Cloing Realm");
    realm.close();
    debug(`Logging out user ${user.id}`);
    await user.logOut();
    process.exit(0);
  });
}

main().catch((err) => {
  debug({ err });
  process.exit(-1);
});
