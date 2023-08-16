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

import { createPromiseHandle } from "../../utils/promise-handle";

export function itUploadsDeletesAndDownloads(): void {
  it("uploads, cleans and downloads", async function (this: RealmContext) {
    const handle = createPromiseHandle();
    if (!this.realm) {
      throw new Error("Expected a 'realm' on the mocha context");
    }
    if (!this.realm.syncSession) {
      throw new Error("Expected a 'syncSession' on the realm");
    }

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const that = this;
    await this.realm.syncSession.uploadAllLocalChanges();
    this.realm.syncSession.addConnectionNotification(async (newState) => {
      if (!that.realm.syncSession) {
        handle.reject("Expected a 'syncSession' on the realm");
      }

      if (newState === "disconnected" /*Realm.App.Sync.ConnectionState.Disconnected*/) {
        await that.closeRealm({ deleteFile: true, clearTestState: true, reopen: true });
        handle.resolve();
      }

      if (newState === "connected" /*Realm.App.Sync.ConnectionState.Connected*/) {
        await that.realm.syncSession?.downloadAllServerChanges();
        handle.resolve();
      }
    });

    this.realm.syncSession.pause();
    await handle;
    that.realm.syncSession?.resume();
    await handle;
  });
}
