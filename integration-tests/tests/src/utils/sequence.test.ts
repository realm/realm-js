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
import { sequence } from "./sequence";

describe("sequence util", () => {
  it("calls functions in sequence and throws when out-of-bounds", () => {
    const seq = sequence(
      () => "hi",
      () => "there",
    );
    expect(seq()).equals("hi");
    expect(seq()).equals("there");
    expect(() => seq()).throws();
  });

  it("passes this and arguments", () => {
    type Context = { prefix: string };
    const seq = sequence(
      function (this: Context, what: string) {
        return `${this.prefix} hello ${what}`;
      },
      function (this: Context, what: string) {
        return `${this.prefix} hi ${what}`;
      },
    );
    const boundSeq = seq.bind({ prefix: "So .." });
    expect(boundSeq("world")).equals("So .. hello world");
    expect(boundSeq("earth")).equals("So .. hi earth");
  });
});
