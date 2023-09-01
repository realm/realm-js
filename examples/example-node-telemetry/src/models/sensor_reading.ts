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

import Realm, { BSON, ObjectSchema } from "realm";
import { MachineInfo } from "./machine_info";

export class SensorReading extends Realm.Object {
  _id!: BSON.ObjectId;
  timestamp!: Date;
  uptime!: number;
  freemem!: number;
  loadAvg!: [number];
  machineInfo!: MachineInfo;

  static schema: ObjectSchema = {
    name: "SensorReading",
    asymmetric: true,
    primaryKey: "_id",
    properties: {
      _id: { type: "objectId", default: () => new BSON.ObjectID() },
      timestamp: { type: "date", optional: false, default: () => new Date() },
      uptime: "int",
      freemem: "int",
      loadAvg: { type: "list", objectType: "float" },
      machineInfo: "MachineInfo",
    },
  };
}
