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

import * as Realm from "realm";
import { MachineInfo } from "./MachineInfo";

export class SensorReading extends Realm.Object {
  _id!: Realm.BSON.ObjectId;
  timestamp!: Date;
  uptime!: number;
  freemem!: number;
  loadAvg!: Realm.List<number>;
  machineInfo!: MachineInfo;

  static schema: Realm.ObjectSchema = {
    name: "SensorReading",
    asymmetric: true,
    primaryKey: "_id",
    properties: {
      _id: { type: "objectId", default: () => new Realm.BSON.ObjectId() },
      timestamp: "date",
      uptime: "float",
      freemem: "int",
      loadAvg: "float[]",
      machineInfo: "MachineInfo",
    },
  };
}
