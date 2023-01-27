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

type FileSystemType = {
  isAbsolutePath(path: string): boolean;
  joinPaths(...segments: string[]): string;
  removeFile(path: string): void;
  removeDirectory(path: string): void;
  getDefaultDirectoryPath(): string;
  exists(path: string): boolean;
  copyBundledRealmFiles(): void;
  // readDirectory(path: string): Dirent[];
  removeRealmFilesFromDirectory(path: string): void;
};

export type Dirent = {
  name: string;
  isFile(): boolean;
  isDirectory(): boolean;
};

export const fs: FileSystemType = {
  isAbsolutePath() {
    throw new Error("Not supported on this platform");
  },
  joinPaths() {
    throw new Error("Not supported on this platform");
  },
  removeFile() {
    throw new Error("Not supported on this platform");
  },
  getDefaultDirectoryPath() {
    throw new Error("Not supported on this platform");
  },
  exists() {
    throw new Error("Not supported on this platform");
  },
  copyBundledRealmFiles() {
    throw new Error("Not supported on this platform");
  },
  removeDirectory() {
    throw new Error("Not supported on this platform");
  },
  /*
  readDirectory() {
    throw new Error("Not supported on this platform");
  },
  */
  removeRealmFilesFromDirectory() {
    throw new Error("Not supported on this platform");
  },
};

export function inject(injected: FileSystemType) {
  Object.freeze(Object.assign(fs, injected));
}
