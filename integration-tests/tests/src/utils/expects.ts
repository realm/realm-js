////////////////////////////////////////////////////////////////////////////
//
// Copyright 2024 Realm Inc.
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
import Realm, { Counter } from "realm";

export function expectRealmList(value: unknown): asserts value is Realm.List<unknown> {
  expect(value).instanceOf(Realm.List);
}

export function expectRealmDictionary(value: unknown): asserts value is Realm.Dictionary<unknown> {
  expect(value).instanceOf(Realm.Dictionary);
}

export function expectRealmResults(value: unknown): asserts value is Realm.Results<unknown> {
  expect(value).instanceOf(Realm.Results);
}

export function expectRealmSet(value: unknown): asserts value is Realm.Set<unknown> {
  expect(value).instanceOf(Realm.Set);
}

export function expectCounter(value: unknown): asserts value is Counter {
  expect(value).to.be.instanceOf(Counter);
}
