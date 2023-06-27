////////////////////////////////////////////////////////////////////////////
//
// Copyright 2020 Realm Inc.
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

import { assert } from "chai";

import { WatchStream, WatchStreamState } from "../services/MongoDBService/WatchStream";
import { WatchError } from "../services/MongoDBService/WatchError";

describe("WatchStream", () => {
  describe("SSE processing", () => {
    describe("successes", () => {
      it("empty kind", () => {
        const ws = new WatchStream();
        ws.feedSse({ data: `{"a": 1}`, eventType: "" });
        assert.deepEqual(ws.state, WatchStreamState.HAVE_EVENT);
        assert.deepEqual(ws.nextEvent() as any, { a: 1 });
        assert.deepEqual(ws.state, WatchStreamState.NEED_DATA);
      });

      it("message kind", () => {
        const ws = new WatchStream();
        ws.feedSse({ data: `{"a": 1}`, eventType: "message" });
        assert.deepEqual(ws.state, WatchStreamState.HAVE_EVENT);
        assert.deepEqual(ws.nextEvent() as any, { a: 1 });
        assert.deepEqual(ws.state, WatchStreamState.NEED_DATA);
      });

      it("message kind by default", () => {
        const ws = new WatchStream();
        ws.feedSse({ data: `{"a": 1}` });
        assert.deepEqual(ws.state, WatchStreamState.HAVE_EVENT);
        assert.deepEqual(ws.nextEvent() as any, { a: 1 });
        assert.deepEqual(ws.state, WatchStreamState.NEED_DATA);
      });

      it("two messages", () => {
        const ws = new WatchStream();
        ws.feedSse({ data: `{"a": 1}` });
        assert.deepEqual(ws.state, WatchStreamState.HAVE_EVENT);
        assert.deepEqual(ws.nextEvent() as any, { a: 1 });
        assert.deepEqual(ws.state, WatchStreamState.NEED_DATA);
        ws.feedSse({ data: `{"a": 2}` });
        assert.deepEqual(ws.state, WatchStreamState.HAVE_EVENT);
        assert.deepEqual(ws.nextEvent() as any, { a: 2 });
        assert.deepEqual(ws.state, WatchStreamState.NEED_DATA);
      });

      it("unknown kinds are ignored", () => {
        const ws = new WatchStream();
        ws.feedSse({ data: `{"a": 1}`, eventType: "ignoreme" });
        assert.deepEqual(ws.state, WatchStreamState.NEED_DATA);
        ws.feedSse({ data: `{"a": 2}` });
        assert.deepEqual(ws.state, WatchStreamState.HAVE_EVENT);
        assert.deepEqual(ws.nextEvent() as any, { a: 2 });
        assert.deepEqual(ws.state, WatchStreamState.NEED_DATA);
      });

      it("percent encoding (all valid)", () => {
        const ws = new WatchStream();
        // Note that %0A and %0D are both whitespace control characters,
        // so they are not allowed to appear in json strings, and are
        // ignored like whitespace during parsing. The error section
        // provides more coverage for them.
        ws.feedSse({ data: `{"a": "%25" %0A %0D }` });
        assert.deepEqual(ws.state, WatchStreamState.HAVE_EVENT);
        assert.deepEqual(ws.nextEvent() as any, { a: "%" });
        assert.deepEqual(ws.state, WatchStreamState.NEED_DATA);
      });

      it("percent encoding (some invalid)", () => {
        const ws = new WatchStream();
        // Unknown % sequences are ignored.
        ws.feedSse({ data: `{"a": "%25 %26%" %0A %0D }` });
        assert.deepEqual(ws.state, WatchStreamState.HAVE_EVENT);
        assert.deepEqual(ws.nextEvent() as any, { a: "% %26%" });
        assert.deepEqual(ws.state, WatchStreamState.NEED_DATA);
      });
    });

    describe("errors", () => {
      describe("well-formed server error", () => {
        it("simple", () => {
          const ws = new WatchStream();
          ws.feedSse({
            data: `{"error_code": "BadRequest", "error": ":("}`,
            eventType: "error",
          });
          assert.strictEqual(ws.state, WatchStreamState.HAVE_ERROR);
          assert.instanceOf(ws.error, WatchError);
          assert.deepEqual(ws.error?.code, "BadRequest");
          assert.deepEqual(ws.error?.message, ":(");
        });

        it("reading error doesn't consume it", () => {
          const ws = new WatchStream();
          ws.feedSse({
            data: `{"error_code": "BadRequest", "error": ":("}`,
            eventType: "error",
          });
          assert.deepEqual(ws.state, WatchStreamState.HAVE_ERROR);
          assert.instanceOf(ws.error, WatchError);
          assert.deepEqual(ws.error?.code, "BadRequest");
          assert.deepEqual(ws.error?.message, ":(");
          // Above is same as "simple" SECTION.
          assert.deepEqual(ws.state, WatchStreamState.HAVE_ERROR);
          assert.instanceOf(ws.error, WatchError);
          assert.deepEqual(ws.error?.code, "BadRequest");
          assert.deepEqual(ws.error?.message, ":(");
        });

        it("with unknown code", () => {
          const ws = new WatchStream();
          ws.feedSse({
            data: `{"error_code": "WhoKnows", "error": ":("}`,
            eventType: "error",
          });
          assert.deepEqual(ws.state, WatchStreamState.HAVE_ERROR);
          assert.instanceOf(ws.error, WatchError);
          // FIXME: Behavior in realm-web (no list of errors)
          assert.deepEqual(ws.error?.code, "WhoKnows");
          assert.deepEqual(ws.error?.message, ":(");
        });

        it("percent encoding", () => {
          const ws = new WatchStream();
          ws.feedSse({
            data: `{"error_code": "BadRequest", "error": "100%25 failure"}`,
            eventType: "error",
          });
          assert.deepEqual(ws.state, WatchStreamState.HAVE_ERROR);
          assert.instanceOf(ws.error, WatchError);
          assert.deepEqual(ws.error?.code, "BadRequest");
          assert.deepEqual(ws.error?.message, "100% failure");
        });

        it("extra field", () => {
          const ws = new WatchStream();
          ws.feedSse({
            data: `{"bonus": "field", "error_code": "BadRequest", "error": ":("}`,
            eventType: "error",
          });
          assert.deepEqual(ws.state, WatchStreamState.HAVE_ERROR);
          assert.instanceOf(ws.error, WatchError);
          assert.deepEqual(ws.error?.code, "BadRequest");
          assert.deepEqual(ws.error?.message, ":(");
        });
      });
      describe("malformed server error", () => {
        it("invalid json", () => {
          const ws = new WatchStream();
          ws.feedSse({
            data: `{"no closing: "}"`,
            eventType: "error",
          });
          assert.deepEqual(ws.state, WatchStreamState.HAVE_ERROR);
          assert.instanceOf(ws.error, WatchError);
          assert.deepEqual(ws.error?.code, "unknown");
          assert.deepEqual(ws.error?.message, `{"no closing: "}"`);
        });

        it("missing error", () => {
          const ws = new WatchStream();
          ws.feedSse({
            data: `{"error_code": "BadRequest"}`,
            eventType: "error",
          });
          assert.deepEqual(ws.state, WatchStreamState.HAVE_ERROR);
          assert.instanceOf(ws.error, WatchError);
          assert.deepEqual(ws.error?.code, "unknown");
          assert.deepEqual(ws.error?.message, `{"error_code": "BadRequest"}`);
        });

        it("missing error_code", () => {
          const ws = new WatchStream();
          ws.feedSse({ data: `{"error": ":("}`, eventType: "error" });
          assert.deepEqual(ws.state, WatchStreamState.HAVE_ERROR);
          assert.instanceOf(ws.error, WatchError);
          assert.deepEqual(ws.error?.code, "unknown");
          assert.deepEqual(ws.error?.message, `{"error": ":("}`);
        });

        it("error wrong type", () => {
          const ws = new WatchStream();
          ws.feedSse({
            data: `{"error_code": "BadRequest", "error": 1}`,
            eventType: "error",
          });
          assert.deepEqual(ws.state, WatchStreamState.HAVE_ERROR);
          assert.instanceOf(ws.error, WatchError);
          assert.deepEqual(ws.error?.code, "unknown");
          assert.deepEqual(ws.error?.message, `{"error_code": "BadRequest", "error": 1}`);
        });

        it("error_code wrong type", () => {
          const ws = new WatchStream();
          ws.feedSse({
            data: `{"error_code": 1, "error": ":("}`,
            eventType: "error",
          });
          assert.deepEqual(ws.state, WatchStreamState.HAVE_ERROR);
          assert.instanceOf(ws.error, WatchError);
          assert.deepEqual(ws.error?.code, "unknown");
          assert.deepEqual(ws.error?.message, `{"error_code": 1, "error": ":("}`);
        });

        it("not an object", () => {
          const ws = new WatchStream();
          ws.feedSse({
            data: `"I'm just a string in the world"`,
            eventType: "error",
          });
          assert.deepEqual(ws.state, WatchStreamState.HAVE_ERROR);
          assert.instanceOf(ws.error, WatchError);
          assert.deepEqual(ws.error?.code, "unknown");
          assert.deepEqual(ws.error?.message, `"I'm just a string in the world"`);
        });

        it("a lot of percent encoding", () => {
          const ws = new WatchStream();
          // Note, trailing % is a special case that should be preserved if more is added.
          ws.feedSse({ data: `%25%26%0A%0D%`, eventType: "error" });
          assert.deepEqual(ws.state, WatchStreamState.HAVE_ERROR);
          assert.instanceOf(ws.error, WatchError);
          assert.deepEqual(ws.error?.code, "unknown");
          assert.deepEqual(ws.error?.message, "%%26\n\r%"); // NOTE: not a raw string so has real CR and LF bytes.
        });
      });
      describe("malformed ordinary event", () => {
        it("invalid json", () => {
          const ws = new WatchStream();
          ws.feedSse({ data: `{"no closing: "}"` });
          assert.deepEqual(ws.state, WatchStreamState.HAVE_ERROR);
          assert.instanceOf(ws.error, WatchError);
          assert.deepEqual(ws.error?.code, "bad bson parse");
          assert.deepEqual(ws.error?.message, `server returned malformed event: {"no closing: "}"`);
        });

        it("not an object", () => {
          const ws = new WatchStream();
          ws.feedSse({ data: `"I'm just a string in the world"` });
          assert.deepEqual(ws.state, WatchStreamState.HAVE_ERROR);
          assert.instanceOf(ws.error, WatchError);
          assert.deepEqual(ws.error?.code, "bad bson parse");
          assert.deepEqual(ws.error?.message, `server returned malformed event: "I'm just a string in the world"`);
        });
      });
    });
  });

  // Defining a shorthand so that it is less disruptive to put this after every line.
  function assertND(ws: WatchStream<any>) {
    assert.equal(ws.state, WatchStreamState.NEED_DATA);
  }

  describe("line processing", () => {
    it("simple", () => {
      const ws = new WatchStream();
      ws.feedLine(`event: message`);
      assertND(ws);
      ws.feedLine(`data: {"a": 1}`);
      assertND(ws);
      ws.feedLine(``);
      assert.deepEqual(ws.state, WatchStreamState.HAVE_EVENT);
      assert.deepEqual(ws.nextEvent() as any, { a: 1 });
      assert.deepEqual(ws.state, WatchStreamState.NEED_DATA);
    });

    it("with LF", () => {
      const ws = new WatchStream();
      ws.feedLine("event: message\n");
      assertND(ws);
      ws.feedLine('data: {"a": 1}\n');
      assertND(ws);
      ws.feedLine("\n");
      assert.deepEqual(ws.state, WatchStreamState.HAVE_EVENT);
      assert.deepEqual(ws.nextEvent() as any, { a: 1 });
      assert.deepEqual(ws.state, WatchStreamState.NEED_DATA);
    });

    it("with CR", () => {
      const ws = new WatchStream();
      ws.feedLine("event: message\r");
      assertND(ws);
      ws.feedLine('data: {"a": 1}\r');
      assertND(ws);
      ws.feedLine("\r");
      assert.deepEqual(ws.state, WatchStreamState.HAVE_EVENT);
      assert.deepEqual(ws.nextEvent() as any, { a: 1 });
      assert.deepEqual(ws.state, WatchStreamState.NEED_DATA);
    });

    it("with CRLF", () => {
      const ws = new WatchStream();
      ws.feedLine("event: message\r\n");
      assertND(ws);
      ws.feedLine('data: {"a": 1}\r\n');
      assertND(ws);
      ws.feedLine("\r\n");
      assert.deepEqual(ws.state, WatchStreamState.HAVE_EVENT);
      assert.deepEqual(ws.nextEvent() as any, { a: 1 });
      assert.deepEqual(ws.state, WatchStreamState.NEED_DATA);
    });

    it("no space", () => {
      const ws = new WatchStream();
      ws.feedLine(`event:message`);
      assertND(ws);
      ws.feedLine(`data:{"a": 1}`);
      assertND(ws);
      ws.feedLine(``);
      assert.deepEqual(ws.state, WatchStreamState.HAVE_EVENT);
      assert.deepEqual(ws.nextEvent() as any, { a: 1 });
      assert.deepEqual(ws.state, WatchStreamState.NEED_DATA);
    });

    it("only last event kind used", () => {
      const ws = new WatchStream();
      ws.feedLine(`event: error`);
      assertND(ws);
      ws.feedLine(`data: {"a": 1}`);
      assertND(ws);
      ws.feedLine(`event: gibberish`);
      assertND(ws);
      ws.feedLine(`event: message`);
      assertND(ws);
      ws.feedLine(``);
      assert.deepEqual(ws.state, WatchStreamState.HAVE_EVENT);
      assert.deepEqual(ws.nextEvent() as any, { a: 1 });
      assert.deepEqual(ws.state, WatchStreamState.NEED_DATA);
    });

    it("multiple", () => {
      const ws = new WatchStream();
      ws.feedLine(`event: message`);
      assertND(ws);
      ws.feedLine(`data: {"a": 1}`);
      assertND(ws);
      ws.feedLine(``);
      assert.deepEqual(ws.state, WatchStreamState.HAVE_EVENT);
      assert.deepEqual(ws.nextEvent() as any, { a: 1 });
      assert.deepEqual(ws.state, WatchStreamState.NEED_DATA);
      ws.feedLine(`event:message`);
      assertND(ws);
      ws.feedLine(`data:{"a": 2}`);
      assertND(ws);
      ws.feedLine(``);
      assert.deepEqual(ws.state, WatchStreamState.HAVE_EVENT);
      assert.deepEqual(ws.nextEvent() as any, { a: 2 });
      assert.deepEqual(ws.state, WatchStreamState.NEED_DATA);
    });

    it("multiple with implicit event kind", () => {
      const ws = new WatchStream();
      ws.feedLine(`data: {"a": 1}`);
      assertND(ws);
      ws.feedLine(``);
      assert.deepEqual(ws.state, WatchStreamState.HAVE_EVENT);
      assert.deepEqual(ws.nextEvent() as any, { a: 1 });
      assert.deepEqual(ws.state, WatchStreamState.NEED_DATA);
      ws.feedLine(`data:{"a": 2}`);
      assertND(ws);
      ws.feedLine(``);
      assert.deepEqual(ws.state, WatchStreamState.HAVE_EVENT);
      assert.deepEqual(ws.nextEvent() as any, { a: 2 });
      assert.deepEqual(ws.state, WatchStreamState.NEED_DATA);
    });

    it("data spread over multiple lines", () => {
      const ws = new WatchStream();
      ws.feedLine(`data: {"a"`);
      assertND(ws);
      ws.feedLine(`data::`);
      assertND(ws);
      ws.feedLine(`data: 1}`);
      ws.feedLine(``);
      assert.deepEqual(ws.state, WatchStreamState.HAVE_EVENT);
      assert.deepEqual(ws.nextEvent() as any, { a: 1 });
      assert.deepEqual(ws.state, WatchStreamState.NEED_DATA);
    });

    it("comments ignored", () => {
      const ws = new WatchStream();
      ws.feedLine(`:`);
      assertND(ws);
      ws.feedLine(`data: {"a"`);
      assertND(ws);
      ws.feedLine(`:`);
      assertND(ws);
      ws.feedLine(`data::`);
      assertND(ws);
      ws.feedLine(`:`);
      assertND(ws);
      ws.feedLine(`data: 1}`);
      assertND(ws);
      ws.feedLine(`:`);
      assertND(ws);
      ws.feedLine(``);
      assert.deepEqual(ws.state, WatchStreamState.HAVE_EVENT);
      assert.deepEqual(ws.nextEvent() as any, { a: 1 });
      assert.deepEqual(ws.state, WatchStreamState.NEED_DATA);
    });

    it("unknown fields ignored", () => {
      const ws = new WatchStream();
      ws.feedLine(`hmm: thinking`);
      assertND(ws);
      ws.feedLine(`data: {"a"`);
      assertND(ws);
      ws.feedLine(`id: 12345`); // id is a part of the spec we don't use
      assertND(ws);
      ws.feedLine(`data::`);
      assertND(ws);
      ws.feedLine(`retry: 12345`); // retry is a part of the spec we don't use
      assertND(ws);
      ws.feedLine(`data: 1}`);
      assertND(ws);
      ws.feedLine(`lines with no colon are treated as all field and ignored`);
      assertND(ws);
      ws.feedLine(``);
      assert.deepEqual(ws.state, WatchStreamState.HAVE_EVENT);
      assert.deepEqual(ws.nextEvent() as any, { a: 1 });
      assert.deepEqual(ws.state, WatchStreamState.NEED_DATA);
    });

    it("events without data are ignored", () => {
      const ws = new WatchStream();
      ws.feedLine(`event: message`);
      assertND(ws);
      ws.feedLine(``); // noop dispatch
      assertND(ws);
      ws.feedLine(`event: error`);
      assertND(ws);
      ws.feedLine(``); // noop dispatch
      assertND(ws);
      // Note, because prior events are ignored, this is treated as if there was no event kind, so it uses the
      // default "message" kind
      ws.feedLine(`data: {"a": 1}`);
      assertND(ws);
      ws.feedLine(``);
      assert.deepEqual(ws.state, WatchStreamState.HAVE_EVENT);
      assert.deepEqual(ws.nextEvent() as any, { a: 1 });
      assert.deepEqual(ws.state, WatchStreamState.NEED_DATA);
    });

    it("new line handling (prestripped)", () => {
      const ws = new WatchStream();
      // since newlines are ignored in json, this tests using the mal-formed error case
      ws.feedLine(`event: error`);
      assertND(ws);
      ws.feedLine(`data: this error`);
      assertND(ws);
      ws.feedLine(`data:  has three lines`);
      assertND(ws);
      ws.feedLine(`data:  but only two LFs`);
      assertND(ws);
      ws.feedLine(``);
      assert.deepEqual(ws.state, WatchStreamState.HAVE_ERROR);
      assert.deepEqual(ws.error?.message, "this error\n has three lines\n but only two LFs");
    });

    it("new line handling (LF)", () => {
      const ws = new WatchStream();
      // since newlines are ignored in json, this tests using the mal-formed error case
      ws.feedLine("event: error\n");
      assertND(ws);
      ws.feedLine("data: this error\n");
      assertND(ws);
      ws.feedLine("data:  has three lines\n");
      assertND(ws);
      ws.feedLine("data:  but only two LFs\n");
      assertND(ws);
      ws.feedLine("\n");
      assert.deepEqual(ws.state, WatchStreamState.HAVE_ERROR);
      assert.deepEqual(ws.error?.message, "this error\n has three lines\n but only two LFs");
    });

    it("new line handling (CR)", () => {
      const ws = new WatchStream();
      // since newlines are ignored in json, this tests using the mal-formed error case
      ws.feedLine("event: error\r");
      assertND(ws);
      ws.feedLine("data: this error\r");
      assertND(ws);
      ws.feedLine("data:  has three lines\r");
      assertND(ws);
      ws.feedLine("data:  but only two LFs\r");
      assertND(ws);
      ws.feedLine("\r");
      assert.deepEqual(ws.state, WatchStreamState.HAVE_ERROR);
      assert.deepEqual(ws.error?.message, "this error\n has three lines\n but only two LFs");
    });

    it("new line handling (CRLF)", () => {
      const ws = new WatchStream();
      // since newlines are ignored in json, this tests using the mal-formed error case
      ws.feedLine("event: error\r\n");
      assertND(ws);
      ws.feedLine("data: this error\r\n");
      assertND(ws);
      ws.feedLine("data:  has three lines\r\n");
      assertND(ws);
      ws.feedLine("data:  but only two LFs\r\n");
      assertND(ws);
      ws.feedLine("\r\n");
      assert.deepEqual(ws.state, WatchStreamState.HAVE_ERROR);
      assert.deepEqual(ws.error?.message, "this error\n has three lines\n but only two LFs");
    });
  });

  describe("buffer processing", () => {
    /**
     * @param str Turns a string into a buffer.
     * @returns A buffer representation of the string.
     */
    function toBuffer(str: string): Uint8Array {
      return Uint8Array.from(str, (c: string) => c.charCodeAt(0));
    }

    /**
     * Strips leading spaces off of each line, and removes the first line if empty, and returns a Uint8Array
     * Makes multi-line nows`tag template strings` cleaner by allowing indentation.
     * @returns A buffer of from multi-line strings.
     * @param args All the nows strings.
     * @param args."0" The first nows string.
     */
    function nows([str]: TemplateStringsArray, ...args: []): Uint8Array {
      assert.deepEqual(args, []);

      if (str.startsWith("\n")) str = str.substr(1);
      str = str
        .split("\n")
        .map((line) => line.trimLeft())
        .join("\n");
      return toBuffer(str);
    }

    it("simple", () => {
      const ws = new WatchStream();
      ws.feedBuffer(nows`
                event: message
                data: {"a": 1}

            `);
      assert.deepEqual(ws.state, WatchStreamState.HAVE_EVENT);
      assert.deepEqual(ws.nextEvent() as any, { a: 1 });
      assert.deepEqual(ws.state, WatchStreamState.NEED_DATA);
    });

    it("multi", () => {
      const ws = new WatchStream();
      ws.feedBuffer(nows`
                event: message
                data: {"a": 1}

            `);
      assert.deepEqual(ws.state, WatchStreamState.HAVE_EVENT);
      assert.deepEqual(ws.nextEvent() as any, { a: 1 });
      assert.deepEqual(ws.state, WatchStreamState.NEED_DATA);
      ws.feedBuffer(nows`
                event: message
                data: {"a": 2}

            `);
      assert.deepEqual(ws.state, WatchStreamState.HAVE_EVENT);
      assert.deepEqual(ws.nextEvent() as any, { a: 2 });
      assert.deepEqual(ws.state, WatchStreamState.NEED_DATA);
    });

    it("multi in one buffer", () => {
      const ws = new WatchStream();
      ws.feedBuffer(nows`
                event: message
                data: {"a": 1}

                event: message
                data: {"a": 2}

            `);
      assert.deepEqual(ws.state, WatchStreamState.HAVE_EVENT);
      assert.deepEqual(ws.nextEvent() as any, { a: 1 });
      assert.deepEqual(ws.state, WatchStreamState.HAVE_EVENT);
      assert.deepEqual(ws.nextEvent() as any, { a: 2 });
      assert.deepEqual(ws.state, WatchStreamState.NEED_DATA);
    });

    it("partial lines", () => {
      const ws = new WatchStream();
      ws.feedBuffer(nows`
                event: message
                data: {"a":`);
      assertND(ws);
      ws.feedBuffer(nows`
                1`);
      assertND(ws);
      ws.feedBuffer(nows`
                }

            `);
      assert.deepEqual(ws.state, WatchStreamState.HAVE_EVENT);
      assert.deepEqual(ws.nextEvent() as any, { a: 1 });
      assert.deepEqual(ws.state, WatchStreamState.NEED_DATA);
    });

    it("multi and partial lines", () => {
      const ws = new WatchStream();
      ws.feedBuffer(nows`
                event: message
                data: {"a": 1}

                event: message
                data: {"a":`);
      assert.deepEqual(ws.state, WatchStreamState.HAVE_EVENT);
      assert.deepEqual(ws.nextEvent() as any, { a: 1 });
      assert.deepEqual(ws.state, WatchStreamState.NEED_DATA);
      ws.feedBuffer(nows`
                    2`);
      assertND(ws);
      ws.feedBuffer(nows`
                }

                event: message
                data: {"a": 3}

            `);
      assert.deepEqual(ws.state, WatchStreamState.HAVE_EVENT);
      assert.deepEqual(ws.nextEvent() as any, { a: 2 });
      assert.deepEqual(ws.state, WatchStreamState.HAVE_EVENT);
      assert.deepEqual(ws.nextEvent() as any, { a: 3 });
      assert.deepEqual(ws.state, WatchStreamState.NEED_DATA);
    });

    it("CR alone isn't treated as a newline", () => {
      const ws = new WatchStream();
      // This is a deviation from the spec. We do not support the legacy macOS < 10 CR-only newlines.
      // The server does not generate them, and there would be some overhead to supporting them.
      ws.feedBuffer(toBuffer('event: message\rdata: {"a": 1}\r\r'));
      // This is what we do.
      assert.deepEqual(ws.state, WatchStreamState.NEED_DATA);
    });
  });
});
