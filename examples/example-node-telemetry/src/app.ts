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

import * as os from "node:os";
import { machineId } from "node-machine-id";

import createDebug from "debug";
export const debug = createDebug("realm:telemetry");

import * as Realm from "realm";
import { MachineInfo } from "./models/MachineInfo";
import { SensorReading } from "./models/SensorReading";
import { config } from "./config";

const INSERT_DATA_INTERVAL = 10_000 as const;

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
async function readMachineInfo(): Promise<MachineInfo> {
  const identifier = await machineId();
  const platform = os.platform();
  const release = os.release();
  return { identifier, platform, release } as MachineInfo;
}

async function main() {
  // Initialize the app using the App ID. To copy it, see:
  // https://www.mongodb.com/docs/atlas/app-services/apps/metadata/#std-label-find-your-app-id
  const app = new Realm.App(config.appId);
  debug(`App ${config.appId} has been initiated`);

  // We are using an anonymous user for this example app, but you can modify this to
  // use any of the available auth providers.
  debug(`Logging in`);
  const user = await app.logIn(Realm.Credentials.anonymous());
  debug(`User ${user.id} has been logged in`);

  // For Data Ingest (`asymmetric: true` in the `SensorReading` schema) you don't need
  // to set up any subscriptions for flexible sync since no data will be synced to the device.
  debug("Opening Realm");
  const realm = await Realm.open({
    schema: [SensorReading, MachineInfo],
    sync: {
      flexible: true,
      user,
    },
  });

  // The metadata about the computer will not change, thus we only read it once.
  const machineInfo = await readMachineInfo();
  const intervalId = setInterval(() => {
    const now = new Date();
    const measurement = readSensorData();
    const obj = {
      timestamp: now,
      machineInfo,
      ...measurement,
    } as unknown as SensorReading;
    debug("Writing new sensor reading");
    realm.write(() => realm.create(SensorReading, obj));
  }, INSERT_DATA_INTERVAL);

  // Catch CTRL-C in a nice way
  process.stdin.resume();
  process.on("SIGINT", async () => {
    debug("Shutting down.");
    debug("Remove periodic sensor readings");
    clearInterval(intervalId);
    debug("Sync any outstanding changes");
    await realm.syncSession?.uploadAllLocalChanges();
    debug("Closing Realm");
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
