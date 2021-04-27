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

export { App } from "./App";

import parseErrorStack from "react-native/Libraries/Core/Devtools/parseErrorStack";
import symbolicateStackTrace from "react-native/Libraries/Core/Devtools/symbolicateStackTrace";

console.log("Hello from the Realm React Native integration tests!");

try {
  const Realm = require("realm");
  console.log("Realm was loaded:", Realm);
} catch (err) {
  const stack = parseErrorStack(err.stack);
  symbolicateStackTrace(stack).then(stack => {
    console.error("Failed to load Realm!", stack);
  });
}
