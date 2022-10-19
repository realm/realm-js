////////////////////////////////////////////////////////////////////////////
//
// Copyright 2016 Realm Inc.
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

/* eslint-env es6, node */
/* eslint-disable no-console */

function trySetElectronVersion() {
  if (!process.versions || !process.env.REALM_ELECTRON_VERSION) {
    return;
  }

  const descriptor = Object.getOwnPropertyDescriptor(process.versions, "electron");
  if (descriptor.writable) {
    process.versions.electron = process.env.REALM_ELECTRON_VERSION;
  }

  if (descriptor.set) {
    descriptor.set(process.env.REALM_ELECTRON_VERSION);
  }
}

// // Ensure node-pre-gyp uses the correct binary
trySetElectronVersion();

const { Realm, flags } = require(process.argv[2]);
flags.ALLOW_VALUES_ARRAYS = true;
Realm.defaultPath = process.argv[3];

process.on("message", (message) => {
  process.send(handleMessage(message));
});

function handleMessage(message) {
  let error, result;
  if (message[0] == "echo") {
    return { result: message[1] };
  }

  try {
    let realm = new Realm(message[0]);
    realm.write(() => {
      if (message[1] == "create") {
        message[3].map((value) => realm.create(message[2], value));
      } else if (message[1] == "delete") {
        let objects = realm.objects(message[2]);
        objects = message[3].map((index) => objects[index]);
        realm.delete(objects);
      } else if (message[1] == "update") {
        message[3].map((value) => realm.create(message[2], value, true));
      } else if (message[1] == "list_method") {
        var listObject = realm.objects(message[2])[0];
        var list = listObject[message[3]];
        list[message[4]].apply(list, message.slice(5));
      } else {
        throw new Error("Unknown realm method: " + message[1]);
      }
    });
  } catch (e) {
    console.warn(e);
    error = e.message;
  }

  return { error, result };
}
