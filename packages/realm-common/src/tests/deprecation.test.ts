////////////////////////////////////////////////////////////////////////////
//
// Copyright 2021 Realm Inc.
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

import { handleDeprecatedPositionalArgs } from "../deprecation";

describe("Deprecation handling", () => {
  describe("handleDeprecatedPositionalArgs", () => {
    let consoleOutput: unknown[] = [];
    const originalConsoleWarn = console.warn;

    // Capture console.warn output to an array for the duration of the test so we can assert warnings were(n't) logged
    beforeEach(() => {
      console.warn = (x) => consoleOutput.push(x);
      consoleOutput = [];
    });

    afterEach(() => {
      console.warn = originalConsoleWarn;
    });

    describe("without restArgs", () => {
      it("does nothing if the first argument is an object", () => {
        const arg = { testArg: 1 };
        const result = handleDeprecatedPositionalArgs<{ testArg: number }>([arg], "test", ["testArg"]);

        expect(result.argsObject).equals(arg);
        expect(result.restArgs).to.be.undefined;

        expect(consoleOutput).to.have.length(0);
      });

      it("converts a single positional argument into an object and shows a deprecation warning", () => {
        const result = handleDeprecatedPositionalArgs<{ testArg: number }>([1], "test", ["testArg"]);

        expect(result.argsObject).deep.equals({ testArg: 1 });
        expect(result.restArgs).to.be.undefined;

        expect(consoleOutput).to.have.length(1);
        expect(consoleOutput[0]).to.equal(
          "Deprecation warning from Realm: test(testArg) is deprecated and will be removed in a future major release. Consider switching to test({ testArg }).",
        );
      });

      it("converts multiple positional arguments into an object and shows a deprecation warning", () => {
        const result = handleDeprecatedPositionalArgs<{ testArg1: number; testArg2: string; testArg3: boolean }>(
          [1, "a", false],
          "test",
          ["testArg1", "testArg2", "testArg3"],
        );

        expect(result.argsObject).deep.equals({ testArg1: 1, testArg2: "a", testArg3: false });
        expect(result.restArgs).to.be.undefined;

        expect(consoleOutput).to.have.length(1);
        expect(consoleOutput[0]).to.equal(
          "Deprecation warning from Realm: test(testArg1, testArg2, testArg3) is deprecated and will be removed in a future major release. Consider switching to test({ testArg1, testArg2, testArg3 }).",
        );
      });
    });

    describe("with restArgs", () => {
      it("does nothing and passes through restArgs if the first argument is an object", () => {
        const arg = { testArg: 1 };
        const result = handleDeprecatedPositionalArgs<{ testArg: number }>(
          [arg, "a", false],
          "test",
          ["testArg"],
          true,
        );

        expect(result.argsObject).equals(arg);
        expect(result.restArgs).deep.equals(["a", false]);

        expect(consoleOutput).to.have.length(0);
      });

      it("converts a single positional argument into an object, passes through restArgs, and shows a deprecation warning", () => {
        const result = handleDeprecatedPositionalArgs<{ testArg: number }>([1, "a", false], "test", ["testArg"], true);

        expect(result.argsObject).deep.equals({ testArg: 1 });
        expect(result.restArgs).deep.equals(["a", false]);

        expect(consoleOutput).to.have.length(1);
        expect(consoleOutput[0]).to.equal(
          "Deprecation warning from Realm: test(testArg, ...args) is deprecated and will be removed in a future major release. Consider switching to test({ testArg }, ...args).",
        );
      });

      it("converts multiple positional arguments into an object passes through restArgs, and shows a deprecation warning", () => {
        const result = handleDeprecatedPositionalArgs<{ testArg1: number; testArg2: string; testArg3: boolean }>(
          [1, "a", false, "b", true],
          "test",
          ["testArg1", "testArg2", "testArg3"],
          true,
        );

        expect(result.argsObject).deep.equals({ testArg1: 1, testArg2: "a", testArg3: false });
        expect(result.restArgs).deep.equals(["b", true]);

        expect(consoleOutput).to.have.length(1);
        expect(consoleOutput[0]).to.equal(
          "Deprecation warning from Realm: test(testArg1, testArg2, testArg3, ...args) is deprecated and will be removed in a future major release. Consider switching to test({ testArg1, testArg2, testArg3 }, ...args).",
        );
      });
    });
  });
});
