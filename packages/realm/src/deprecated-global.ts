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

import { Realm as RealmConstructor, flags, safeGlobalThis } from "./internal";

let warnedAboutGlobalRealmUse = false;
Object.defineProperty(safeGlobalThis, "Realm", {
  get() {
    if (flags.THROW_ON_GLOBAL_REALM) {
      throw new Error(
        "Accessed global Realm, please update your code to ensure you import Realm:\nimport Realm from 'realm';",
      );
    } else if (!warnedAboutGlobalRealmUse) {
      // eslint-disable-next-line no-console
      console.warn(
        "Your app is relying on a Realm global, which will be removed in realm-js v13, please update your code to ensure you import Realm:\n\n",
        'import Realm from "realm"; // For ES Modules\n',
        'const Realm = require("realm"); // For CommonJS\n\n',
        "To determine where, put this in the top of your index file:\n",
        `import Realm from "realm";\n`,
        `Realm.flags.THROW_ON_GLOBAL_REALM = true`,
      );
      warnedAboutGlobalRealmUse = true;
    }
    return RealmConstructor;
  },
  configurable: true,
});

declare global {
  /** @deprecated Will be removed in v13.0.0. Please use an import statement. */
  type Realm = RealmConstructor;
  /** @deprecated Will be removed in v13.0.0. Please use an import statement. */
  const Realm: typeof RealmConstructor;
}
