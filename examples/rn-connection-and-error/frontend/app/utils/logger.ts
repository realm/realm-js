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

import type {SyncError} from 'realm';

/**
 * Logger - This is meant to be replaced with a preferred logging implementation.
 */
export const logger = {
  info(message: string): void {
    console.log(new Date().toLocaleString(), '|', message);
  },
  error(error: string | SyncError): void {
    const message =
      typeof error === 'string' ? error : formatErrorMessage(error);
    // Not using `console.error` here to not print stack trace.
    console.log(new Date().toLocaleString(), '|', message);
  },
};

function formatErrorMessage(error: SyncError): string {
  return (
    `${error.name}:` +
    `\n  Message: ${error.message}.` +
    `\n  Reason: ${error.reason}` +
    `\n  ${JSON.stringify(error)}`
  );
}
