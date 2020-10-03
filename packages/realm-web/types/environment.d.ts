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

/**
 * A simplified interface for the console.
 * This should reflect the lowest common denominator across environemnts.
 */
interface Console {
    /**
     * Log something.
     */
    log(...data: any[]): void;

    /**
     * Log a warning.
     */
    warn(...data: any[]): void;

    /**
     * Log an error.
     */
    error(...data: any[]): void;
}

declare const console: Console;

// Timer related stuff
type TimerHandle = any;
type TimerHandler = string | Function;
declare function setTimeout(
    handler: TimerHandler,
    timeout?: number,
    ...arguments: any[]
): TimerHandle;
declare function setInterval(
    handler: TimerHandler,
    timeout?: number,
    ...arguments: any[]
): TimerHandle;
declare function clearInterval(handle?: TimerHandle): void;
declare function clearTimeout(handle?: TimerHandle): void;

/**
 * This will be replaced in by Rollup.
 */
// declare const __SDK_VERSION__: string;
