////////////////////////////////////////////////////////////////////////////
//
// Copyright 2024 Realm Inc.
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

// Our use of `exports` in `packages/realm/package.json` is not enabled by
// default when using Metro and RN. In these cases, modules imported from
// "realm/experimental" will search for the file in the same path, rather
// than what is pointed to under `exports`. Thus, we use this .js file to
// in turn import the necessary module.

// (Enabling `unstable_enablePackageExports` in the metro config unexpectedly
// does not work.)

/* eslint-env commonjs */
module.exports = require("../dist/experimental/base-url");
