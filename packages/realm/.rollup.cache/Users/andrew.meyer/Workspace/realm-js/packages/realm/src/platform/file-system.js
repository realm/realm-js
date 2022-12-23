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
export const fs = {
    removeFile() {
        throw new Error("Not supported on this platform");
    },
    removeDirectory() {
        throw new Error("Not supported on this platform");
    },
    isAbsolutePath() {
        throw new Error("Not supported on this platform");
    },
    joinPaths() {
        throw new Error("Not supported on this platform");
    },
    getDefaultDirectoryPath() {
        throw new Error("Not supported on this platform");
    },
    readDirectory() {
        throw new Error("Not supported on this playform");
    },
    exists() {
        throw new Error("Not supported on this playform");
    },
    copyBundledRealmFiles() {
        throw new Error("Not supported on this playform");
    },
};
export function inject(injected) {
    Object.freeze(Object.assign(fs, injected));
}
//# sourceMappingURL=file-system.js.map