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

import { expect } from "chai";
import {
  ConnectionState,
  NumericLogLevel,
  OpenRealmBehaviorType,
  OpenRealmTimeOutBehavior,
  SessionStopPolicy,
} from "realm";

describe("Enums", function () {
  describe("ConnectionState", function () {
    it("is accessible", function () {
      expect(typeof ConnectionState === "object");
      expect(typeof ConnectionState.Disconnected === "string");
      expect(typeof ConnectionState.Connecting === "string");
      expect(typeof ConnectionState.Connecting === "string");
    });
  });
  describe("SessionStopPolicy", function () {
    it("is accessible", function () {
      expect(typeof SessionStopPolicy === "object");
      expect(typeof SessionStopPolicy.AfterUpload === "string");
      expect(typeof SessionStopPolicy.Immediately === "string");
      expect(typeof SessionStopPolicy.Never === "string");
    });
  });
  describe("OpenRealmBehaviourType", function () {
    it("is accessible", function () {
      expect(typeof OpenRealmBehaviorType === "object");
      expect(typeof OpenRealmBehaviorType.DownloadBeforeOpen === "string");
      expect(typeof OpenRealmBehaviorType.OpenImmediately === "string");
    });
  });
  describe("OpenRealmTimeOutBehaviour", function () {
    it("is accessible", function () {
      expect(typeof OpenRealmTimeOutBehavior === "object");
      expect(typeof OpenRealmTimeOutBehavior.OpenLocalRealm === "string");
      expect(typeof OpenRealmTimeOutBehavior.ThrowException === "string");
    });
  });
  describe("NumericLogLevel", function () {
    it("is accessible", function () {
      expect(typeof NumericLogLevel === "object");
      expect(typeof NumericLogLevel.All === "number");
      expect(typeof NumericLogLevel.Debug === "number");
      expect(typeof NumericLogLevel.Detail === "number");
      expect(typeof NumericLogLevel.Error === "number");
      expect(typeof NumericLogLevel.Fatal === "number");
      expect(typeof NumericLogLevel.Info === "number");
      expect(typeof NumericLogLevel.Off === "number");
      expect(typeof NumericLogLevel.Trace === "number");
      expect(typeof NumericLogLevel.Warn === "number");
    });
  });
});
