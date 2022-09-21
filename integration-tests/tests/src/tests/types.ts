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

import { expect } from "chai";
import Realm from "realm";

describe("Realm.Types namespace", () => {
  it("Realm.Types.Decimal128 can be constructed", () => {
    const instance = new Realm.Types.Decimal128();
    expect(instance).to.be.instanceOf(Realm.BSON.Decimal128);
  });

  it("Realm.Types.ObjectId can be constructed", () => {
    const instance = new Realm.Types.ObjectId();
    expect(instance).to.be.instanceOf(Realm.BSON.ObjectId);
  });

  it("Realm.Types.Date can be constructed", () => {
    const instance = new Realm.Types.Date();
    expect(instance).to.be.instanceOf(Date);
  });

  it("Realm.Types.Data can be constructed", () => {
    const instance = new Realm.Types.Data();
    expect(instance).to.be.instanceOf(ArrayBuffer);
  });
});
