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

import { EJSON } from "bson";

import { getEnvironment } from "../../environment";
import { WatchError } from "./WatchError";

type Document = Realm.Services.MongoDB.Document;
type ChangeEvent<T extends Document> = Realm.Services.MongoDB.ChangeEvent<T>;

type ServerSentEvent = {
  data: string;
  eventType?: string;
};

// NOTE: this is a fully processed event, not a single "data: foo" line!
/**
 * The state of a WatchStream.
 */
export enum WatchStreamState {
  /**
   * Need to call one of the feed functions.
   */
  NEED_DATA = "NEED_DATA",
  /**
   * Call nextEvent() to consume an event.
   */
  HAVE_EVENT = "HAVE_EVENT",
  /**
   * Call error().
   */
  HAVE_ERROR = "HAVE_ERROR",
}

/**
 * Represents a stream of events
 */
export class WatchStream<T extends Document = Document> {
  // Call these when you have data, in whatever shape is easiest for your SDK to get.
  // Pick one, mixing and matching on a single instance isn't supported.
  // These can only be called in NEED_DATA state, which is the initial state.
  feedBuffer(buffer: Uint8Array): void {
    this.assertState(WatchStreamState.NEED_DATA);
    this._buffer += this._textDecoder.decode(buffer, { stream: true });
    this.advanceBufferState();
  }

  feedLine(line: string): void {
    this.assertState(WatchStreamState.NEED_DATA);
    // This is an implementation of the algorithm described at
    // https://html.spec.whatwg.org/multipage/server-sent-events.html#event-stream-interpretation.
    // Currently the server does not use id or retry lines, so that processing isn't implemented.

    // ignore trailing LF if not removed by SDK.
    if (line.endsWith("\n")) line = line.substr(0, line.length - 1);

    // Ignore trailing CR from CRLF
    if (line.endsWith("\r")) line = line.substr(0, line.length - 1);

    if (line.length === 0) {
      // This is the "dispatch the event" portion of the algorithm.
      if (this._dataBuffer.length === 0) {
        this._eventType = "";
        return;
      }

      if (this._dataBuffer.endsWith("\n")) this._dataBuffer = this._dataBuffer.substr(0, this._dataBuffer.length - 1);

      this.feedSse({
        data: this._dataBuffer,
        eventType: this._eventType,
      });
      this._dataBuffer = "";
      this._eventType = "";
    }

    if (line[0] === ":") return;

    const colon = line.indexOf(":");
    const field = line.substr(0, colon);
    let value = colon === -1 ? "" : line.substr(colon + 1);
    if (value.startsWith(" ")) value = value.substr(1);

    if (field === "event") {
      this._eventType = value;
    } else if (field === "data") {
      this._dataBuffer += value;
      this._dataBuffer += "\n";
    } else {
      // Line is ignored (even if field is id or retry).
    }
  }

  feedSse(sse: ServerSentEvent): void {
    this.assertState(WatchStreamState.NEED_DATA);
    const firstPercentIndex = sse.data.indexOf("%");
    if (firstPercentIndex !== -1) {
      // For some reason, the stich server decided to add percent-encoding for '%', '\n', and '\r' to its
      // event-stream replies. But it isn't real urlencoding, since most characters pass through, so we can't use
      // uri_percent_decode() here.
      let buffer = "";
      let start = 0;
      for (let percentIndex = firstPercentIndex; percentIndex !== -1; percentIndex = sse.data.indexOf("%", start)) {
        buffer += sse.data.substr(start, percentIndex - start);

        const encoded = sse.data.substr(percentIndex, 3); // May be smaller than 3 if string ends with %
        if (encoded === "%25") {
          buffer += "%";
        } else if (encoded === "%0A") {
          buffer += "\x0A"; // '\n'
        } else if (encoded === "%0D") {
          buffer += "\x0D"; // '\r'
        } else {
          buffer += encoded; // Propagate as-is
        }
        start = percentIndex + encoded.length;
      }

      // Advance the buffer with the last part
      buffer += sse.data.substr(start);

      sse.data = buffer;
    }

    if (!sse.eventType || sse.eventType === "message") {
      try {
        const parsed = EJSON.parse(sse.data);
        if (typeof parsed === "object") {
          // ???
          this._nextEvent = parsed as ChangeEvent<T>;
          this._state = WatchStreamState.HAVE_EVENT;
          return;
        }
      } catch {
        // Fallthrough to same handling as for non-document value.
      }
      this._state = WatchStreamState.HAVE_ERROR;
      this._error = new WatchError({
        message: "server returned malformed event: " + sse.data,
        code: "bad bson parse",
      });
    } else if (sse.eventType === "error") {
      this._state = WatchStreamState.HAVE_ERROR;

      // Default error message if we have issues parsing the reply.
      this._error = new WatchError({
        message: sse.data,
        code: "unknown",
      });
      try {
        const { error_code: errorCode, error } = EJSON.parse(sse.data) as Record<string, string>;
        if (typeof errorCode !== "string") return;
        if (typeof error !== "string") return;
        // XXX in realm-js, object-store will error if the error_code is not one of the known
        // error code enum values.
        this._error = new WatchError({
          message: error,
          code: errorCode,
        });
      } catch {
        return; // Use the default state.
      }
    } else {
      // Ignore other event types
    }
  }

  get state(): WatchStreamState {
    return this._state;
  }

  // Consumes the returned event. If you used feedBuffer(), there may be another event or error after this one,
  // so you need to call state() again to see what to do next.
  nextEvent(): ChangeEvent<T> {
    this.assertState(WatchStreamState.HAVE_EVENT);
    // We can use "as ChangeEvent<T>" since we just asserted the state.
    const out = this._nextEvent as ChangeEvent<T>;
    this._state = WatchStreamState.NEED_DATA;
    this.advanceBufferState();
    return out;
  }

  // Once this enters the error state, it stays that way. You should not feed any more data.
  get error(): WatchError | null {
    return this._error;
  }

  ////////////////////////////////////////////

  private advanceBufferState() {
    this.assertState(WatchStreamState.NEED_DATA);
    while (this.state === WatchStreamState.NEED_DATA) {
      if (this._bufferOffset === this._buffer.length) {
        this._buffer = "";
        this._bufferOffset = 0;
        return;
      }

      // NOTE not supporting CR-only newlines, just LF and CRLF.
      const nextNewlineIndex = this._buffer.indexOf("\n", this._bufferOffset);
      if (nextNewlineIndex === -1) {
        // We have a partial line.
        if (this._bufferOffset !== 0) {
          // Slide the partial line down to the front of the buffer.
          this._buffer = this._buffer.substr(this._bufferOffset, this._buffer.length - this._bufferOffset);
          this._bufferOffset = 0;
        }
        return;
      }

      this.feedLine(this._buffer.substr(this._bufferOffset, nextNewlineIndex - this._bufferOffset));
      this._bufferOffset = nextNewlineIndex + 1; // Advance past this line, including its newline.
    }
  }

  private assertState(state: WatchStreamState) {
    if (this._state !== state) {
      throw Error(`Expected WatchStream to be in state ${state}, but in state ${this._state}`);
    }
  }

  private _nextEvent: ChangeEvent<T> | undefined;

  private _state: WatchStreamState = WatchStreamState.NEED_DATA;

  private _error: WatchError | null = null;

  // Used by feedBuffer to construct lines
  private _textDecoder = new (getEnvironment().TextDecoder)();
  private _buffer = "";
  private _bufferOffset = 0;

  // Used by feedLine for building the next SSE
  private _eventType = "";
  private _dataBuffer = "";
}
