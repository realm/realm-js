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
import { inject } from "../platform/file-system";
import { extendDebug } from "../debug";
const debug = extendDebug("fs");
inject({
    removeFile(path) {
        throw new Error("Not yet implemented");
    },
    removeDirectory(path) {
        throw new Error("Not yet implemented");
    },
    getDefaultDirectoryPath() {
        throw new Error("Not yet implemented");
    },
    isAbsolutePath(path) {
        throw new Error("Not yet implemented");
    },
    joinPaths(...segments) {
        throw new Error("Not yet implemented");
    },
    readDirectory(path) {
        throw new Error("Not yet implemented");
    },
    exists(path) {
        throw new Error("Not yet implemented");
    },
    copyBundledRealmFiles() {
        throw new Error("Not yet implemented");
    },
});
//# sourceMappingURL=fs.js.map