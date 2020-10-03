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

// Our version of Node.js types are very restricted
// This file will get resolved when realm's dependency on bson resolves a dependency on @types/node.
// We need this file to prevent the NodeJS globals to be accessable from within the test source files.

/**
 * The simplest buffer we can come up with.
 * NOTE: This is needed because the "bson" package's types depends on it.
 */
type Buffer = Uint8Array;

/**
 * Used by the "detect-browser" package.
 */
declare namespace NodeJS {
    type Platform = string;
}
