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
      expect(ConnectionState).to.deep.equal({
        Disconnected: "disconnected",
        Connecting: "connecting",
        Connected: "connected",
      });
    });
  });
  describe("SessionStopPolicy", function () {
    it("is accessible", function () {
      expect(SessionStopPolicy).to.deep.equal({
        AfterUpload: "after-upload",
        Immediately: "immediately",
        Never: "never",
      });
    });
  });
  describe("OpenRealmBehaviorType", function () {
    it("is accessible", function () {
      expect(OpenRealmBehaviorType).to.deep.equal({
        DownloadBeforeOpen: "downloadBeforeOpen",
        OpenImmediately: "openImmediately",
      });
    });
  });
  describe("OpenRealmTimeOutBehavior", function () {
    it("is accessible", function () {
      expect(OpenRealmTimeOutBehavior).to.deep.equal({
        OpenLocalRealm: "openLocalRealm",
        ThrowException: "throwException",
      });
    });
  });
  describe("NumericLogLevel", function () {
    it("is accessible", function () {
      expect(NumericLogLevel).to.deep.equal({
        "0": "All",
        "1": "Trace",
        "2": "Debug",
        "3": "Detail",
        "4": "Info",
        "5": "Warn",
        "6": "Error",
        "7": "Fatal",
        "8": "Off",
        All: 0,
        Trace: 1,
        Debug: 2,
        Detail: 3,
        Info: 4,
        Warn: 5,
        Error: 6,
        Fatal: 7,
        Off: 8,
      });
    });
  });
});
