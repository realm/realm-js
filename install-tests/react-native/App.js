////////////////////////////////////////////////////////////////////////////
//
// Copyright 2021 Realm Inc.
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

import { useEffect } from "react";
import Realm from "realm";

const CALLBACK_HOST = "http://localhost:3000";
const DELAY = 5000;
const schema = [{ name: "Person", properties: { name: "string" } }];
const App = () => {
  useEffect(() => {
    const realm = new Realm({ schema });
    // Write persons into the database
    if (realm.empty) {
      realm.write(() => {
        realm.create("Person", { name: "Alice" });
        realm.create("Person", { name: "Bob" });
        realm.create("Person", { name: "Charlie" });
      });
    }
    // Read the persons out of the database again
    const message =
      "Persons are " +
      realm
        .objects("Person")
        .map((p) => p.name)
        .join(", ");
    console.log(`Sending '${message}'`);
    // Perform a request to signal a successful write & read
    setTimeout(() => {
      fetch(CALLBACK_HOST, {
        method: "POST",
        body: message,
      }).catch(console.error);
    }, DELAY);
    // Close the Realm when component unmounts
    return () => realm.close();
  }, []);
  return null;
};

export default App;
