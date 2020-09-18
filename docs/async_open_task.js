////////////////////////////////////////////////////////////////////////////
//
// Copyright 2019 Realm Inc.
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
 * @memberof Realm.App.Sync
 */
class AsyncOpenTask {

    /**
     * Cancels any current running download.
     * If multiple AsyncOpenTasks are all in the progress for the same Realm, then canceling one of them
     * will cancel all of them.
     */
    cancel() { }

    /**
     * Register to receive progress notifications while the download is in progress.
     *
     * @param {callback(transferred, transferable)} callback - called with the following arguments:
     *   - `transferred` - the current number of bytes already transferred
     *   - `transferable` - the total number of transferable bytes (the number of bytes already transferred plus the number of bytes pending transfer)
     */
    progress(callback) {}

}