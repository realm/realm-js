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
      expect(ConnectionState).to.be.an("object");
      expect(ConnectionState.Disconnected).equals("disconnected");
      expect(ConnectionState.Connecting).equals("connecting");
      expect(ConnectionState.Connected).equals("connected");
    });
  });
  describe("SessionStopPolicy", function () {
    it("is accessible", function () {
      expect(SessionStopPolicy).to.be.an("object");
      expect(SessionStopPolicy.AfterUpload).equals("after-upload");
      expect(SessionStopPolicy.Immediately).equals("immediately");
      expect(SessionStopPolicy.Never).equals("never");
    });
  });
  describe("OpenRealmBehaviourType", function () {
    it("is accessible", function () {
      expect(OpenRealmBehaviorType).to.be.an("object");
      expect(OpenRealmBehaviorType.DownloadBeforeOpen).equals("downloadBeforeOpen");
      expect(OpenRealmBehaviorType.OpenImmediately).equals("openImmediately");
    });
  });
  describe("OpenRealmTimeOutBehaviour", function () {
    it("is accessible", function () {
      expect(OpenRealmTimeOutBehavior).to.be.an("object");
      expect(OpenRealmTimeOutBehavior.OpenLocalRealm).equals("openLocalRealm");
      expect(OpenRealmTimeOutBehavior.ThrowException).equals("throwException");
    });
  });
  describe("NumericLogLevel", function () {
    it("is accessible", function () {
      expect(NumericLogLevel).to.be.an("object");
      expect(NumericLogLevel.All).equals(0);
      expect(NumericLogLevel.Trace).equals(1);
      expect(NumericLogLevel.Debug).equals(2);
      expect(NumericLogLevel.Detail).equals(3);
      expect(NumericLogLevel.Info).equals(4);
      expect(NumericLogLevel.Warn).equals(5);
      expect(NumericLogLevel.Error).equals(6);
      expect(NumericLogLevel.Fatal).equals(7);
      expect(NumericLogLevel.Off).equals(8);
    });
  });
});
